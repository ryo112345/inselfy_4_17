"use client";

import { useState, useCallback, useRef } from "react";
import { AdaptiveSelector, type Pair } from "./lib/adaptive-selector";
import { NEED_IDS, type NeedId } from "./lib/needs";
import {
  startSession,
  submitResult,
  type SessionDTO,
  type ResultDTO,
  type ResponseDTO,
} from "./api";

export type QuizPhase = "idle" | "loading" | "active" | "submitting" | "done" | "error";

export interface DebugNeedInfo {
  needId: NeedId;
  mu: number;
  se: number;
  appearances: number;
  rank: number;
}

export interface DebugInfo {
  needs: DebugNeedInfo[];
  boundary: {
    upper: { diff: number; seSum: number; stable: boolean };
    lower: { diff: number; seSum: number; stable: boolean };
  };
}

export interface QuizState {
  phase: QuizPhase;
  currentPair: { needA: NeedId; needB: NeedId } | null;
  questionNumber: number;
  maxQuestions: number;
  result: ResultDTO | null;
  error: string | null;
  debug: DebugInfo | null;
}

export function useWorkValuesQuiz(userId: string) {
  const [state, setState] = useState<QuizState>({
    phase: "idle",
    currentPair: null,
    questionNumber: 0,
    maxQuestions: 70,
    result: null,
    error: null,
    debug: null,
  });

  const selectorRef = useRef<AdaptiveSelector | null>(null);
  const sessionRef = useRef<SessionDTO | null>(null);

  const start = useCallback(async () => {
    setState((s) => ({ ...s, phase: "loading", error: null }));
    try {
      const session = await startSession(userId);
      sessionRef.current = session;

      const initialPairs: Pair[] = session.initial_pairs.map((p) => ({
        needA: NEED_IDS.indexOf(p.need_a as NeedId),
        needB: NEED_IDS.indexOf(p.need_b as NeedId),
      }));

      const selector = new AdaptiveSelector(initialPairs);
      selectorRef.current = selector;

      const pair = selector.nextPair();
      if (!pair) throw new Error("No pairs available");

      setState({
        phase: "active",
        currentPair: { needA: NEED_IDS[pair.needA], needB: NEED_IDS[pair.needB] },
        questionNumber: 1,
        maxQuestions: 70,
        result: null,
        error: null,
        debug: null,
      });
    } catch (e) {
      setState((s) => ({
        ...s,
        phase: "error",
        error: e instanceof Error ? e.message : "Unknown error",
      }));
    }
  }, [userId]);

  const answer = useCallback(async (winner: NeedId) => {
    const selector = selectorRef.current;
    if (!selector || !state.currentPair) return;

    const pair: Pair = {
      needA: NEED_IDS.indexOf(state.currentPair.needA),
      needB: NEED_IDS.indexOf(state.currentPair.needB),
    };
    const winnerIndex = NEED_IDS.indexOf(winner);
    selector.recordResponse(pair, winnerIndex);

    if (selector.isComplete) {
      setState((s) => ({ ...s, phase: "submitting", currentPair: null }));
      try {
        const responses: ResponseDTO[] = selector.allResponses.map((r) => ({
          need_a: NEED_IDS[r.needA],
          need_b: NEED_IDS[r.needB],
          winner: NEED_IDS[r.winner],
          question_number: r.questionNumber,
        }));

        const bt = selector.currentBT;
        const mu: Record<string, number> = {};
        const se: Record<string, number> = {};
        for (let i = 0; i < NEED_IDS.length; i++) {
          mu[NEED_IDS[i]] = bt.mu[i];
          se[NEED_IDS[i]] = bt.se[i];
        }

        const result = await submitResult(sessionRef.current!.id, responses, mu, se);
        setState((s) => ({ ...s, phase: "done", result }));
      } catch (e) {
        setState((s) => ({
          ...s,
          phase: "error",
          error: e instanceof Error ? e.message : "Submit failed",
        }));
      }
      return;
    }

    const nextPair = selector.nextPair();
    if (!nextPair) return;

    const debug = buildDebugInfo(selector);

    setState((s) => ({
      ...s,
      currentPair: { needA: NEED_IDS[nextPair.needA], needB: NEED_IDS[nextPair.needB] },
      questionNumber: s.questionNumber + 1,
      debug,
    }));
  }, [state.currentPair]);

  return { state, start, answer };
}

function buildDebugInfo(selector: AdaptiveSelector): DebugInfo {
  const bt = selector.currentBT;
  const appearances = selector.needAppearances;
  const boundary = selector.boundaryGaps;

  const needs: DebugNeedInfo[] = NEED_IDS.map((id, i) => ({
    needId: id,
    mu: bt.mu[i],
    se: bt.se[i],
    appearances: appearances[i],
    rank: 0,
  }));

  needs.sort((a, b) => b.mu - a.mu);
  needs.forEach((n, i) => { n.rank = i + 1; });

  return {
    needs,
    boundary: {
      upper: { ...boundary.upper, stable: boundary.upper.diff > boundary.upper.seSum },
      lower: { ...boundary.lower, stable: boundary.lower.diff > boundary.lower.seSum },
    },
  };
}
