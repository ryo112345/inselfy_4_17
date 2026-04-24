import { Node, mergeAttributes } from "@tiptap/react";

export const PaidSeparator = Node.create({
  name: "paidSeparator",
  group: "block",
  atom: true,
  draggable: true,

  parseHTML() {
    return [{ tag: 'div[data-paid-separator="true"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-paid-separator": "true" }),
    ];
  },

  addNodeView() {
    return () => {
      const dom = document.createElement("div");
      dom.setAttribute("data-paid-separator", "true");
      dom.className =
        "my-6 py-3 border-t-2 border-b-2 border-dashed border-amber-300 bg-amber-50/50 text-center text-sm font-medium text-amber-700 select-none cursor-pointer";
      dom.textContent = "ここから有料エリア";
      dom.contentEditable = "false";
      return { dom };
    };
  },
});
