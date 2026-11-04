# The playground modes

`pnpm dev` serves the playground. These addresses show the ways a host can use the editor; the end-to-end
tests drive them. Add `?reset` to start from the sample page, `&lang=vi` for Vietnamese, `&dark` for the dark
scheme, `&plain` for a host with no autosave.

| Address                                   | Shows                                                                         | Test                                    |
| ----------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------- |
| `/`                                       | The editor as it comes                                                        | most of `e2e/`                          |
| `?host`                                   | The editor inside a host with its own sidebar and navbar                      | none yet                                |
| `?control` (`&two`, `&outside`)           | `useEditor` in `headerActions`; a controller and a bar outside the editor     | `control.spec.ts`, `controller.spec.ts` |
| `?overrides` (`&throw`, `&two`)           | Wrapping and replacing parts, and a part that throws                          | `overrides.spec.ts`                     |
| `?permissions` (`&viewer`)                | A locked block, a viewer, hidden parts, `onDenied`                            | `permissions.spec.ts`                   |
| `?compose` (`&bare`, `&nocanvas`, `&two`) | A layout of the host's own made of the parts                                  | `compose.spec.ts`                       |
| a Product block (`&nopicker`)             | A field the host draws the input of                                           | `custom-field.spec.ts`                  |
| `?tools`                                  | A tool of the host on the rail                                                | `host-tool.spec.ts`                     |
| a Menu block                              | An array of objects                                                           | `array-field.spec.ts`                   |
| a Related page block (`&nosource`)        | A field that chooses from the host's list                                     | `external-field.spec.ts`                |
| an Item card block                        | The data of a picked item, stored in the page and shown                       | `external-field.spec.ts`                |
| a Live item block                         | A reference to an item: only the id is stored, the data comes from the source | `external-field.spec.ts`                |
| `?plugin`                                 | A plugin                                                                      | `plugin.spec.ts`                        |
| `?twin`                                   | Two editors side by side (`left` and `right`)                                 | `twin.spec.ts`                          |
| `?preview`                                | The saved page as a visitor gets it                                           | none yet                                |
| `?items-changed`, `?items-lost`           | An Item card checked against a source that has moved on                       | `external-field.spec.ts`                |
