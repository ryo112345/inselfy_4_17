"use client";

import { useState, useCallback, useRef } from "react";
import {
  startSession,
  submitResult,
  type SessionDTO,
  type ResultDTO,
  type ItemDTO,
  type ResponseDTO,
} from "./api";

export type QuizPhase = "idle" | "loading" | "active" | "completed" | "submitting" | "done" | "error";

export interface QuizState {
  phase: QuizPhase;
  currentItem: ItemDTO | null;
  questionNumber: number;
  maxQuestions: number;
  result: ResultDTO | null;
  error: string | null;
}

export function useCareerInterestQuiz(userId: string) {
  const [state, setState] = useState<QuizState>({
    phase: "idle",
    currentItem: null,
    questionNumber: 0,
    maxQuestions: 60,
    result: null,
    error: null,
  });

  const sessionRef = useRef<SessionDTO | null>(null);
  const itemsRef = useRef<ItemDTO[]>([]);
  const responsesRef = useRef<ResponseDTO[]>([]);
  const indexRef = useRef(0);

  const start = useCallback(async () => {
    setState((s) => ({ ...s, phase: "loading", error: null }));
    try {
      const session = await startSession(userId);
      sessionRef.current = session;
      itemsRef.current = session.items;
      responsesRef.current = [];
      indexRef.current = 0;

      setState({
        phase: "active",
        currentItem: session.items[0],
        questionNumber: 1,
        maxQuestions: session.items.length,
        result: null,
        error: null,
      });
    } catch (e) {
      setState((s) => ({
        ...s,
        phase: "error",
        error: e instanceof Error ? e.message : "Unknown error",
      }));
    }
  }, [userId]);

  const answer = useCallback(async (score: number) => {
    const items = itemsRef.current;
    const currentIndex = indexRef.current;
    const currentItem = items[currentIndex];
    if (!currentItem) return;

    responsesRef.current.push({
      question_number: currentIndex + 1,
      item_code: currentItem.item_code,
      score,
    });

    const nextIndex = currentIndex + 1;
    indexRef.current = nextIndex;

    if (nextIndex >= items.length) {
      setState((s) => ({ ...s, phase: "completed", currentItem: null }));
      return;
    }

    setState((s) => ({
      ...s,
      currentItem: items[nextIndex],
      questionNumber: nextIndex + 1,
    }));
  }, []);

  const submit = useCallback(async () => {
    if (!sessionRef.current) return;
    setState((s) => ({ ...s, phase: "submitting" }));
    try {
      const result = await submitResult(
        sessionRef.current.id,
        responsesRef.current,
      );
      setState((s) => ({ ...s, phase: "done", result }));
    } catch (e) {
      setState((s) => ({
        ...s,
        phase: "error",
        error: e instanceof Error ? e.message : "Submit failed",
      }));
    }
  }, []);

  return { state, start, answer, submit, sessionId: sessionRef.current?.id ?? null };
}
