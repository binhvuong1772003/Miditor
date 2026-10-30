import type { PageData, TreeNode } from "../tree/types";
import type { Registry } from "./types";
import { type PropIssue, validateProps } from "./validate-props";

/**
 * What is wrong with one block of a page. `unknown-type`: the registry has no such kind (the editor
 * still draws an empty box there, so the page does not break). `props`: a prop its kind refuses, see
 * `PropIssue`. `cannot-contain`: it has blocks inside, but its kind does not allow that.
 * `phone-props`: a value kept for the phone that is wrong, either because the prop is not marked
 * `perDevice` (`not-per-device`, which also covers a prop with no field) or for the reason of `props`.
 */
export type PageIssue = { id: string } & (
  | { code: "unknown-type" }
  | { code: "props"; key: string; issue: PropIssue["code"] }
  | { code: "cannot-contain" }
  | { code: "phone-props"; key: string; issue: PropIssue["code"] | "not-per-device" }
);

/**
 * Every problem with the blocks of a page, one entry each, walking the tree depth first. An empty
 * list means every block is a known kind with good props. The root is the page itself, not a block:
 * it is not checked, and it can always hold blocks. A block of an unknown kind has nothing to be
 * checked against, so only its kind is reported, but the blocks inside it are still checked.
 * This checks the registry's rules; the shape of the data is `isPageData`.
 */
export function validatePage(registry: Registry, page: PageData): PageIssue[] {
  const issues: PageIssue[] = [];
  const check = (node: TreeNode) => {
    // Own keys only: a kind named `constructor` in saved data is not on the registry.
    const def = Object.hasOwn(registry, node.type) ? registry[node.type] : undefined;
    if (!def) {
      issues.push({ id: node.id, code: "unknown-type" });
    } else {
      for (const { key, code } of validateProps(def, node.props)) {
        issues.push({ id: node.id, code: "props", key, issue: code });
      }
      for (const [key, value] of Object.entries(node.phoneProps ?? {})) {
        const field = Object.hasOwn(def.fields, key) ? def.fields[key] : undefined;
        if (field?.perDevice !== true) {
          issues.push({ id: node.id, code: "phone-props", key, issue: "not-per-device" });
          continue;
        }
        for (const { code } of validateProps(def, { [key]: value })) {
          issues.push({ id: node.id, code: "phone-props", key, issue: code });
        }
      }
      if (!def.canContain && node.children.length > 0) {
        issues.push({ id: node.id, code: "cannot-contain" });
      }
    }
    for (const child of node.children) check(child);
  };
  for (const child of page.root.children) check(child);
  return issues;
}
