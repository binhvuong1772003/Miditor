import type { TreeNode } from "@midito-kitchen/core";
import { createContext, type ReactNode, useContext } from "react";
import { allowed, mayAdd, type Permissions } from "./store/permissions";

/**
 * What the host lets people do, for the parts that draw. Safety is the guard in the store; this is
 * only so the screen does not offer what would be refused. Answers for a node are cached by `allowed`.
 */
export const PermissionsContext = createContext<Permissions | undefined>(undefined);

export const usePermissions = () => useContext(PermissionsContext);

type OnNodeKey = "canEdit" | "canDelete" | "canDuplicate" | "canDrag";

/** Whether `node` passes the permission `key`; a missing node is not refused. */
export function useMay(key: OnNodeKey, node: TreeNode | null | undefined): boolean {
  const permissions = usePermissions();
  return !node || allowed(permissions?.[key], node);
}

/**
 * Whether the library may offer `kind`: asked of the page itself, since the page is where a card puts
 * a block when nothing else is selected. `canAdd: false`, or a function that refuses the page for that
 * kind, turns the card off.
 */
export function useMayAdd(root: TreeNode | undefined, kind: string): boolean {
  const permissions = usePermissions();
  return !root || mayAdd(permissions, root, kind);
}

/** Switches off every native control inside, without a box of its own. */
export function Lock({ locked, children }: { locked: boolean; children: ReactNode }) {
  if (!locked) return <>{children}</>;
  return (
    <fieldset
      disabled
      data-locked=""
      style={{ display: "contents", border: 0, margin: 0, padding: 0, minWidth: 0 }}
    >
      {children}
    </fieldset>
  );
}
