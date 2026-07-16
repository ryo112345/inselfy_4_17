#!/usr/bin/env python3
"""strict-server 移行スモークの前後比較。

使い方: diff_bodies.py <before_dir> <after_dir>

各ケースのステータスと、揮発フィールド（id・タイムスタンプ・生成ファイル名）を
正規化したボディを比較し、差分があれば表示して非ゼロ終了する。
"""

import glob
import json
import os
import re
import sys

# 実行ごとに値が変わる（＝差分として意味がない）フィールド
VOLATILE = {"id", "createdAt", "updatedAt", "attachedAt", "publishedAt", "userId", "postId", "sessionId", "inviteToken", "companyId"}
# scout グループ: スカウト・返信・クレジットの時刻／実行ごとに作られる ID
VOLATILE |= {"sentAt", "expiresAt", "openedAt", "repliedAt", "conversationId", "lastReplenishedAt", "templateId", "senderId"}
# jobs グループ: 実行ごとに作られるスモーク求人の ID
VOLATILE |= {"jobPostingId"}
# 同点スコアの並びが呼び出しごとに揺れる配列（タレント検索の top ラベル）は
# ソートして比較する（順位のタイブレークは実装が非決定的・移行と無関係）
SORT_BEFORE_DIFF = {"topWvLabels", "topCiLabels"}
# 診断セッション開始のたびに時刻シード RNG でシャッフル・抽選される配列。
# WV の initialPairs は常に揮発。CI セッションの items も揮発だが、"items" は
# ページングリスト（{items, total}）の共通キーなので、"total" を伴わない
# 場合（= CI セッション形）だけ揮発として扱う。
VOLATILE |= {"initialPairs"}
# アップロードで生成されるファイル名のランダム部（8hex_ プレフィックス形式と
# フル UUID 形式＝article-images の両方）
RANDOM_FILE = re.compile(
    r"(user-images|job-images|article-images|company-images)/(?:[0-9a-f]{8}_|[0-9a-f-]{36})"
)
# 求人画像アップロードのランダムファイル名（<subdir>/<8hex>.<ext>）
RANDOM_JOB_UPLOAD = re.compile(r"(team-member-photos|gallery-images|cover-images)/[0-9a-f]{8}")
# 企業ギャラリー画像のランダムサフィックス（<companyId>_gallery_<8hex>.<ext>）
RANDOM_GALLERY = re.compile(r"_gallery_[0-9a-f]{8}")


def norm(v):
    if isinstance(v, dict):
        volatile = VOLATILE | ({"items"} if "items" in v and "total" not in v else set())
        return {
            k: (
                "<VOL>"
                if k in volatile
                else sorted(norm(x)) if k in SORT_BEFORE_DIFF and isinstance(x, list) else norm(x)
            )
            for k, x in sorted(v.items())
        }
    if isinstance(v, list):
        return [norm(x) for x in v]
    if isinstance(v, str):
        v = RANDOM_JOB_UPLOAD.sub(r"\1/XXXXXXXX", v)
        return RANDOM_GALLERY.sub("_gallery_XXXXXXXX", RANDOM_FILE.sub(r"\1/XXXXXXXX_", v))
    return v


def load(path):
    raw = open(path).read()
    if not raw.strip():
        return ""
    try:
        v = json.loads(raw)
        # echo の ctx.JSON(201, nil) は "null" を書くが、strict のボディ無し 201 は空。
        # JSON null とボディ無しは同義として比較する（scout グループの意図的微差）。
        return "" if v is None else norm(v)
    except json.JSONDecodeError:
        return raw


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    before, after = sys.argv[1], sys.argv[2]
    diffs = 0
    cases = 0
    for bf in sorted(glob.glob(os.path.join(before, "*.status"))):
        name = os.path.basename(bf)[: -len(".status")]
        af = os.path.join(after, name + ".status")
        if not os.path.exists(af):
            print(f"MISSING in after: {name}")
            diffs += 1
            continue
        cases += 1
        bs, as_ = open(bf).read(), open(af).read()
        if bs != as_:
            print(f"STATUS DIFF {name}: {bs} -> {as_}")
            diffs += 1
        bj = load(os.path.join(before, name + ".body"))
        aj = load(os.path.join(after, name + ".body"))
        if bj != aj:
            print(f"BODY DIFF {name}:")
            print(f"  before: {json.dumps(bj, ensure_ascii=False)[:400]}")
            print(f"  after : {json.dumps(aj, ensure_ascii=False)[:400]}")
            diffs += 1
        # auth グループ: Set-Cookie の名前・属性（値はマスク済み）の比較
        bc, ac = (os.path.join(d, name + ".cookies") for d in (before, after))
        if os.path.exists(bc) or os.path.exists(ac):
            bt = open(bc).read() if os.path.exists(bc) else "<missing>"
            at = open(ac).read() if os.path.exists(ac) else "<missing>"
            if bt != at:
                print(f"COOKIE DIFF {name}:")
                print(f"  before: {bt!r}")
                print(f"  after : {at!r}")
                diffs += 1
    print(f"--- {cases} cases, {diffs} diffs")
    sys.exit(1 if diffs else 0)


if __name__ == "__main__":
    main()
