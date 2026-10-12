# VS Code Copilot Chat: edit-and-resend a user message, and regenerate an assistant response

**Evidence base.** All "verified-from-source" claims come from the `microsoft/vscode` repository on branch `main`,
fetched **2026-09-28** (raw files via `raw.githubusercontent.com`). Repository paths and line numbers refer to that
snapshot; the chat contrib was recently restructured, so older write-ups that point at
`browser/chatListRenderer.ts` / `common/chatModel.ts` are stale — the files now live under `browser/widget/` and
`common/model/`. Local copies of every file cited here are kept next to this report
(`_vscode-chat/src/vs/...` for source, `_docs*/`, `_docs-relnotes/` for docs), with the download/verification scripts
in `_tools/`. These mirrors are disposable scratch evidence and are not part of the deliverable.

Labels used throughout: **[source]** = read from `microsoft/vscode` source; **[docs]** = official VS Code
docs/release notes; **[observational]** = third-party or unverified observation, not a first-party source.

---

## Summary

**1. Edit-and-resend a user message.** Editing a sent request is a first-class, core-workbench feature gated by the
`chat.editRequests` setting (`'inline' | 'hover' | 'input' | 'none'`, default `'inline'`) **[source: chat.shared.contribution.ts L986–991]**.
Clicking (inline mode) or clicking the *Edit Request* toolbar button (hover/input modes) puts the request into an
edit state that is modelled as **`IChatViewModel.editing`** **[source: chatViewModel.ts L93–99, L402–413]**. While
editing, the request's text, attachments, and model selection are copied back into a real chat input — either a
second `ChatInputPart` rendered *inline in the transcript row* inside a `.chat-edit-input-container`, or the bottom
composer. The request being edited and **all later requests are marked "blocked"** via `ChatModel.setCheckpoint`,
which the renderer draws with a disabled overlay. On submit, **those requests are deleted** (`IChatService.removeRequest`)
and a **brand-new request** is sent through the normal `sendRequest` path. **There is no branching and no
"alternatives" model: VS Code truncates.** The docs say file changes from the discarded requests are reverted too
**[docs: chat-checkpoints.md L18]**; I verified the request-level truncation from source and the revert primitive
(`ChatEditingSession.restoreSnapshot`) but could not pin the exact call that reverts files on this particular path
(see Gaps #7). The feature lives in `browser/chatEditing/` because it is coupled to the checkpoint/undo machinery.

**2. Regenerate an assistant response.** The affordance is a **Retry** button (codicon `refresh`) in the response's
hover footer toolbar, backed by action id **`workbench.action.chat.retry`** (`RetryChatAction`) **[source: chatTitleActions.ts L168–263]**.
It is shown **only on the last response** in the transcript (`ContextKeyExpr.in(itemId, lastItemId)`). The handler
calls **`IChatService.resendRequest(request, { attempt: request.attempt + 1, ...currentModelOptions, ...currentModeOptions })`**,
which **removes the existing request from the model** (`ChatRequestRemovalReason.Resend`) and **re-issues the same
parsed message** with the **original `attachedContext` and `locationData`** replayed, but with the model and mode
taken from the *current* pickers, not from the original request **[source: chatServiceImpl.ts L1199–1235]**.
No alternative response is stored; the old response is disposed. A monotonically increasing `attempt` counter is
attached to the request and is surfaced to chat participants **[source: vscode.proposed.chatParticipantPrivate.d.ts L57–59]**.

---

## A. Edit-and-resend

### A1. What the UI does when the user edits a sent message

There are four modes, selected by the `chat.editRequests` setting **[source: chat.shared.contribution.ts L986–991]**:

```ts
'chat.editRequests': {
    markdownDescription: nls.localize('chat.editRequests', "Enables editing of requests in the chat. This allows you to change the request content and resubmit it to the model."),
    type: 'string',
    enum: ['inline', 'hover', 'input', 'none'],
    default: 'inline',
},
```

The setting id is also declared as a constant: `EditRequests = 'chat.editRequests'` **[source: constants.ts L62]**.

All four modes funnel through one entry point, `ChatWidget.startEditing(requestId)` →
`ChatWidget.clickedRequest(item)` **[source: chatWidget.ts L2268–2277, L2279–2427]**:

* **`inline`** (default) — the request bubble's rendered markdown becomes clickable (`.clickable`) with a managed
  hover reading *"Click to Edit"*, and clicking it fires `_onDidClickRequest` **[source: chatListRenderer.ts L5461–5497]**.
* **`hover`** — the same entry point is reached from an *Edit Request* toolbar button on the request row; the inline
  editor is then rendered. The `request-hover` toolbar gets the `expanded` CSS class (wider, labelled) rather than the
  compact 22px icon form **[source: chatListRenderer.ts L1864; chat.css L4323–4341]**.
* **`input`** — the edit happens in the **bottom composer**, which gets the CSS class `editing`
  (`this.inputPart.element.classList.add('editing')`) and the transcript row gets `editing-input` **[source: chatWidget.ts L2342–2344; chatListRenderer.ts L1861]**.
* **`none`** — no editing affordance; the legacy *Undo Requests* button is what remains **[docs: vscode#253081]**.

**Which component renders the edit state.** For `inline`/`hover`, a **new `ChatInputPart` instance is constructed and
inserted into the transcript row**, not a bespoke inline text box:

```ts
if (!isInput) {
    this.inputContainer = dom.$('.chat-edit-input-container');
    item.requestTimestampContainer.before(this.inputContainer);
    this.createInput(this.inputContainer, undefined, editingStore);
    this.input.setChatMode(this.inputPart.currentModeObs.get().id);
    this.input.setPermissionLevel(this.inputPart.currentModeInfo.permissionLevel ?? ChatPermissionLevel.Default);
    this.input.setEditing(true, isEditingSentRequest);
    this._onDidChangeActiveInputEditor.fire();
}
```
**[source: chatWidget.ts L2334–2341]**, with the part itself created at **L2578–2589** and the DOM container styled by
`.interactive-item-container .chat-edit-input-container { width: 100%; }` **[source: chat.css L4641–4643]**.
`getInput()` swaps the widget's notion of "the input" to that inline part while editing **[source: chatWidget.ts L978]**,
and the container is re-parented into the row on re-render (skipping sticky-scroll rows) **[source: chatWidget.ts L2216–2227]**.
While editing, the original request markdown is hidden by CSS (`display: none`), so the editor visually *replaces*
the bubble **[source: chat.css L4595–4598]**.

The renderer reads the live editor text through a delegate, `IChatRendererDelegate.getEditingValue()`
**[source: chatListRenderer.ts L672; chatListWidget.ts L308, L550]**, so the sticky-scroll header shows the text being
typed **[source: chatListRenderer.ts L2609–2648]**.

Cancelling is explicit: `ChatWidget.cancelEditing()` confirms with a *"Discard Edits?"* dialog when the text or
attachments changed, then calls `finishedEditing()` **[source: chatWidget.ts L2429–2472]**.

### A2. What happens to the messages after the edited message

**They are deleted, not branched or kept.** Two source facts establish this:

1. Entering edit sets a **checkpoint** on the edited request:
   `this.viewModel?.model.setCheckpoint(currentElement.id)` **[source: chatWidget.ts L2294]**. `setCheckpoint`
   walks the request list and marks the checkpoint request **and every later request** with
   `setShouldBeBlocked(true)` (and blocks their responses) **[source: chatModel.ts L3270–3308]**. The renderer turns
   `shouldBeBlocked` into a `.disabled` overlay on the row **[source: chatListRenderer.ts L1856–1859]**. This is the
   "these are about to go away" visual state.
2. On submit, those blocked requests are removed:
   ```ts
   if (this.viewModel.model.checkpoint) {
       const requests = this.viewModel.model.getRequests();
       for (let i = requests.length - 1; i >= 0; i -= 1) {
           const request = requests[i];
           if (request.shouldBeBlocked.get() || request === this.viewModel.model.checkpoint) {
               this.chatService.removeRequest(this.viewModel.sessionResource, request.id);
           }
       }
       this.viewModel.model.setCheckpoint(undefined);
   }
   ```
   **[source: chatWidget.ts L3558–3567]**, which lands in `ChatServiceImpl.removeRequest` → `model.removeRequest(requestId)`
   **[source: chatServiceImpl.ts L2302–2315]** → splice + `response.dispose()` **[source: chatModel.ts L3462–3471]**.

The docs state the same thing in prose: *"the edited request is sent to the language model as a new request, and any
file changes made by the original request and subsequent requests are reverted"* **[docs: chat-checkpoints.md L18]**,
and *"this will remove all subsequent requests"* **[docs: v1_102 release notes L126]**.

**File-edit revert — partially verified.** The revert primitive is
`ChatEditingSession.restoreSnapshot(requestId, stopId)` **[source: chatEditingSession.ts L418; chatEditingService.ts L133]**,
and it is called **explicitly** by the Retry action **[source: chatTitleActions.ts L249–252]** and by the *Restore
Checkpoint* / *Undo Requests* actions **[source: chatEditingActions.ts L438, L652]**. On the edit-and-resubmit path I
found the request removal but **no explicit `restoreSnapshot` call**, and no observer in `chatEditingServiceImpl` /
`chatEditingSession` / `chatEditingCheckpointTimelineImpl` that reacts to a `removeRequest` model event to revert files
(the only `chatModel.onDidChange` observer in `chatEditingServiceImpl` early-returns unless `e.kind === 'addRequest'`)
**[source: chatEditingServiceImpl.ts L232–241]**. So either the revert is driven from a place I did not read, or it
happens through the extension/agent-host truncation protocol — the code comments that for agent-host sessions that
support checkpoints, the checkpoint is deliberately preserved *"so blocked requests are removed below and the agent
host can dispatch a protocol truncation action"* **[source: chatWidget.ts L3478–3488]**. See Gaps #7.

**Does the chat model support branching/alternatives here?** No. `ChatRequestRemovalReason` has exactly three
values — `Removal`, `Resend`, `Adoption` — and nothing resembling "superseded/variant" **[source: chatModel.ts L2530–2545]**.
There is no "previous/next response" field on `IChatRequestModel` or `IChatResponseModel`; the only retry-related
state is the integer `attempt` (see B). VS Code *does* have a branching affordance, but it is a **separate,
explicit, session-level action**: `workbench.action.chat.forkConversation` / **Fork Conversation** (codicon
`repoForked`, tooltip *"Fork conversation from this point"*), registered on `MenuId.ChatMessageCheckpoint` and
creating a **new session** from a checkpoint **[source: chatForkActions.ts L24–57; docs: review-code-edits.md L193–195]**.
It is not a per-message alternative list.

### A3. New request that replaces the old one, or in-place mutation?

**A new request replaces the old one.** The edit path never mutates the stored message text of an existing request.
`ChatModel.updateRequest(request, variableData)` exists but only ever rewrites `variableData`, and its single caller is
inside the send pipeline, not the edit flow **[source: chatModel.ts L3405–3408; chatServiceImpl.ts L1800]**.
The edit flow instead removes the old requests and calls the ordinary submit path:

```ts
result = await this.chatService.sendRequest(this.viewModel.sessionResource, requestInputs.input, { onDidCreateResponse, ...selectedModelRequestOptions, ... });
```
**[source: chatWidget.ts L3593–3595]**, producing a **new request id**.

### A4. Concrete implementation: action id, model mutation, request construction

| Piece | Identifier / location | Source |
| --- | --- | --- |
| Edit action id | `workbench.action.chat.editRequests` | **[source: chatEditingActions.ts L659]** |
| Edit action label | `localize2('chat.editRequests.label', "Edit Request")`, icon `Codicon.edit` | **[source: chatEditingActions.ts L660, L663]** |
| Legacy undo action | `workbench.action.chat.undoEdits`, `"Undo Requests"`, `Codicon.discard` | **[source: chatEditingActions.ts L456–460]** |
| Widget entry | `ChatWidget.startEditing(requestId)` → `clickedRequest()` | **[source: chatWidget.ts L2268, L2279]** |
| View-model state | `IChatViewModel.editing`, `setEditing()`, `onDidChangeEditing` | **[source: chatViewModel.ts L93–99, L272–273, L402–413]** |
| Model mutation (mark) | `ChatModel.setCheckpoint(requestId)` | **[source: chatModel.ts L3270–3308]** |
| Model mutation (commit) | `IChatService.removeRequest` → `ChatModel.removeRequest(id)` | **[source: chatServiceImpl.ts L2302–2315; chatModel.ts L3462–3471]** |
| Re-issue | `IChatService.sendRequest(...)` from `ChatWidget._acceptInput` | **[source: chatWidget.ts L3593]** |
| Edit-state teardown | `ChatWidget.finishedEditing(completedEdit?)` | **[source: chatWidget.ts L2474–2540]** |
| Context key | `chatSessionCurrentlyEditing` = `ChatContextKeys.currentlyEditing` | **[source: chatContextKeys.ts L26; chatWidget.ts L2323]** |

Telemetry accompanies the flow: `chat.startEditingRequests` (with `editRequestType` = the `chat.editRequests` mode)
on entry **[source: chatWidget.ts L2416–2426]** and `chat.editRequestsFinished` (with `editCanceled`) on exit
**[source: chatWidget.ts L2524–2539]** — evidence that the three entry points were shipped deliberately as an A/B/C
rollout **[docs: v1_102 release notes L128]**.

Note the menu condition: the *Edit Request* **toolbar button** only appears for `hover` and `input`
(`config.chat.editRequests == 'hover' || == 'input'`), because in `inline` mode the bubble click is the affordance
**[source: chatEditingActions.ts L669–676]**.

### A5. Is the original context/attachments/mode/model replayed or rebuilt?

Mixed — and this is the most interesting part for a reimplementation:

| Aspect | Replayed from the original request? | Evidence |
| --- | --- | --- |
| Message text | Yes — seeded into the editor via `this.input.setValue(currentElement.messageText, false)` (editable copy, not shared state) | **[source: chatWidget.ts L2357]** |
| Attachments / references | **Yes** — collected from every request up to and including the edited one (`request.attachedContext?.forEach(addToContext)`) plus the request VM's `variables`, then `this.input.attachmentModel.addContext(...currentContext)` | **[source: chatWidget.ts L2297–2317, L2350–2352]** |
| Dynamic variables (ranges) | Yes — re-added to the editor model with their ranges so decorations/parsing work | **[source: chatWidget.ts L2359–2388]** |
| Model selection | **Yes** — `void this.input.requestModelByIdentifier(currentElement.modelId, currentElement.modelConfiguration)` | **[source: chatWidget.ts L2345–2347; chatInputPart.ts L1380]** |
| Mode + permission level | **No — taken from the bottom composer at the moment editing starts**: `this.input.setChatMode(this.inputPart.currentModeObs.get().id)` / `setPermissionLevel(this.inputPart.currentModeInfo.permissionLevel ?? Default)` | **[source: chatWidget.ts L2338–2339]** |
| Submit-time precedence | Whatever the *edit editor* holds wins over the bottom composer: `resolveEditedRequestSelection(edited, composer) { return edited ?? composer; }` | **[source: chatInputModelUtils.ts L374–384; chatWidget.ts L3447–3459, L3582–3584]** |

The mode/`modeInfo` gap is real rather than incidental: `IChatRequestModel` **does** store `modeInfo`
**[source: chatModel.ts L146, L451, L524]**, but `IChatRequestViewModel` exposes **no** `modeInfo` accessor at all
(no occurrence of `modeInfo` in `chatViewModel.ts`), and `clickedRequest` never reads a mode from the request. So the
mode is not replayed even though the data is available. Attachments *are* deliberately replayed, deduplicated by
`entry.range ? `${entry.id}:${entry.range.start}-${entry.range.endExclusive}` : entry.id`, with workspace variables,
auto-added prompt-file/text variables, and `isWorkspaceVariableEntry` entries filtered out
**[source: chatWidget.ts L2297–2317]**.

---

## B. Regenerate

### B1. Action id, label, and the component that renders the button

```ts
registerAction2(class RetryChatAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.chat.retry',
            title: localize2('chat.retry.label', "Retry"),
            f1: false,
            category: CHAT_CATEGORY,
            icon: Codicon.refresh,
            menu: [
                {
                    id: MenuId.ChatMessageFooter,
                    group: 'navigation',
                    when: ContextKeyExpr.and(
                        ChatContextKeys.isResponse,
                        ContextKeyExpr.in(ChatContextKeys.itemId.key, ChatContextKeys.lastItemId.key),
                        ChatContextKeys.lockedToCodingAgent.negate())
                },
                {
                    id: MenuId.ChatEditingWidgetToolbar,
                    group: 'navigation',
                    when: ContextKeyExpr.and(applyingChatEditsFailedContextKey, ChatContextKeys.lockedToCodingAgent.negate()),
                    order: 0
                }
            ]
        });
    }
```
**[source: chatTitleActions.ts L168–193]**.

The label is literally **"Retry"** — there is no separate "Regenerate" action in the open-source workbench. Two menu
placements exist: the response footer toolbar (`MenuId.ChatMessageFooter`) and the Chat Editing widget toolbar (shown
when applying chat edits failed).

`MenuId.ChatMessageFooter` is a core menu id **[source: src/vs/platform/actions/common/actions.ts L267]**. It is
rendered by `ChatListItemRenderer` into `.chat-footer-toolbar`, a `MenuWorkbenchToolBar` created per row
**[source: chatListRenderer.ts L1409–1430]**. The `when` clause `ContextKeyExpr.in(itemId, lastItemId)`
(`chatItemId` ∈ `chatLastItemId`) restricts Retry to the **last** response
**[source: chatContextKeys.ts L43–44; chatTitleActions.ts L182]**.

### B2. What the operation actually does

```ts
const request = chatModel?.getRequests().find(candidate => candidate.id === item.requestId);

chatAccessibilityService.acceptRequest(item.sessionResource);
chatService.resendRequest(request!, {
    ...widget?.getSelectedModelRequestOptions(),
    attempt: (request?.attempt ?? -1) + 1,
    ...widget?.getModeRequestOptions(),
});
```
**[source: chatTitleActions.ts L254–261]**

and in the service:

```ts
async resendRequest(request: IChatRequestModel, options?: IChatSendRequestOptions, preserveRequestId = false): Promise<void> {
    ...
    const preservedRequest = preserveRequestId && request instanceof ChatRequestModel ? request : undefined;
    if (!preservedRequest) {
        model.removeRequest(request.id, ChatRequestRemovalReason.Resend);
    }

    const resendOptions: IChatSendRequestOptions = {
        ...options,
        locationData: request.locationData,
        attachedContext: request.attachedContext,
    };
    await this._sendRequestAsync(model, model.sessionResource, request.message, attempt, enableCommandDetection, defaultAgent, location, resendOptions, preservedRequest, preserveRequestId ? request.id : undefined).responseCompletePromise;
}
```
**[source: chatServiceImpl.ts L1199–1235]**

So the answer is unambiguous: **delete the last response (drop the whole request) and re-issue the same request. It
does not request a new sample and append it as an alternative.** The removal reason is a dedicated enum member
documented as *"Removed because the request will be resent"* **[source: chatModel.ts L2536–2539]**, and
`ChatRequestRemovalReason.Resend` has exactly one caller — this function.

Note the in-place-error variant: `ChatErrorConfirmationPart` can call
`chatService.resendRequest(request, options, buttonData.preserveRequestId)` **[source: chatErrorConfirmationPart.ts L79]**,
where `preserveRequestId = true` keeps the same request id and skips the removal — a retry that *replaces the response
under the same request* rather than removing and re-adding. `ChatWidget.rerunLastRequest()` performs the same
increment-and-resend **[source: chatWidget.ts L3211–3231]**, as does the renderer's
`onDidClickRerunWithAgentOrCommandDetection` handler **[source: chatListWidget.ts L576–589]**.

### B3. Alternatives / variants

**None exist.** There is no `alternatives`, `variants`, `previousResponse`, or `nextResponse` field anywhere in the
chat model or view model; grep across the whole chat contrib for those terms yields only unrelated hits (model speed
variants, session-type alternative ids, tool-recommendation alternatives). The only retry-related state is
`attempt: number` on the request **[source: chatModel.ts L149, L419, L472–484, L523; chatViewModel.ts L111, L455–456]**,
threaded through `IChatSendRequestOptions.attempt` **[source: chatService.ts L1989]** into
`ChatRequestModel.attempt` and exposed to the agent as `IChatAgentRequest.attempt`, documented as *"The attempt number
of the request. The first request has attempt number 0."* **[source: vscode.proposed.chatParticipantPrivate.d.ts L57–59]**.

`attempt` is **not rendered in the transcript** — `ChatListItemRenderer` never reads it — so the user cannot page
between responses. The point of `attempt` is to let the *participant* know it is a retry (e.g. to vary its prompt or
bypass a filter), not to model user-visible history. Two PRs confirm it was added and then wired into the retry
action for exactly that reason: *"Support for `attempt` and `enableCommandDetection` in chat model/service"*
([#209826](https://github.com/microsoft/vscode/pull/209826), 2024-04-08) **[source: commit `ef6345ae05`]** and
*"Increment the request attempt in the chat retry action"* ([#243471](https://github.com/microsoft/vscode/pull/243471),
2025-03-15) **[source: commit `580daf039a`]**.

### B4. Does regenerating preserve attachments/references/model?

* **Attachments / references / location:** **yes, replayed verbatim** — `attachedContext: request.attachedContext`
  and `locationData: request.locationData` are spliced into the resend options **[source: chatServiceImpl.ts L1229–1233]**.
  The message is literally `request.message` (the parsed request), so text, `@`-mentions, and slash commands survive.
* **Model and mode:** **rebuilt from the current pickers, not the original request.**
  `widget?.getSelectedModelRequestOptions()` and `widget?.getModeRequestOptions()` are spread into the resend options
  and override whatever the request originally ran with **[source: chatTitleActions.ts L257–261]**. Consistent with
  this, PR [#244160](https://github.com/microsoft/vscode/pull/244160) is titled *"Use the correct mode when
  retrying"* **[source: commit `777ca727ac`, 2025-03-20]** — the mode spread on the retry call is the mechanism.
  `resendRequest` never reads `request.modelId` when it re-issues (it only passes the request's
  message/attachments/location) **[source: chatServiceImpl.ts L1224–1234]**.
* For the edit-and-resend path, the model *is* replayed from the request (`requestModelByIdentifier`), which is a
  deliberate asymmetry between the two features.

---

## C. Interaction design details worth copying

### C1. Where the affordances live

**Edit (request rows).** A dedicated `.request-hover` container is appended to the request row and hosts a
`MenuWorkbenchToolBar` for `MenuId.ChatMessageTitle` **[source: chatListRenderer.ts L1346–1360]**. It is
**absolutely positioned at the top-right of the request bubble, overlapping its top edge**:

```css
.request-hover {
    position: absolute;
    overflow: hidden;
    z-index: 100;
    top: -13px;
    right: 20px;
    border-radius: var(--vscode-cornerRadius-large);
    height: 26px;
}
.request-hover.expanded:not(.checkpoints-enabled) { width: 50px; }
.request-hover.editing { opacity: 1 !important; }
```
**[source: chat.css L4311–4333]**

It starts hidden — `this.hoverHidden(requestHover)` sets `opacity: 0` **[source: chatListRenderer.ts L1360, L5696–5701]** —
and is revealed by row hover: `.interactive-item-container.interactive-request:not(.editing):hover .request-hover { opacity: 1 !important; }`
**[source: chat.css L3983–3985]**, and pinned visible when focus is inside (`.request-hover:focus-within`) or while
editing **[source: chat.css L4331–4333, L4355–4357]**. If the toolbar has no applicable actions it is hidden entirely
(`.request-hover.has-no-actions`, `.request-hover.hidden`) **[source: chat.css L4262–4265; chatListRenderer.ts L1863]**.
In `hover` mode the toolbar is `expanded` (labelled, ~50px); otherwise it is a compact 22×22 icon bar
**[source: chat.css L4323–4353]**.

**Retry (response rows).** A `.chat-footer-toolbar` sits **below the response content**
**[source: chatListRenderer.ts L1409–1430]**. Its visibility is a three-way rule that is worth copying nearly verbatim:

```css
/* Show toolbar on hover and last response. Keep it visible when keyboard focus moves inside the response. */
.interactive-item-container.interactive-response.chat-most-recent-response:not(.chat-response-loading) .chat-footer-toolbar,
.interactive-item-container.interactive-response:not(.chat-response-loading):focus-within .chat-footer-toolbar,
.interactive-item-container.interactive-response:not(.chat-response-loading).group-hovered .chat-footer-toolbar {
    opacity: 1;
    transition: opacity 0.1s ease-in-out;
}
```
**[source: chat.css L340–358]**

Default state is `display: block; opacity: 0` **[source: chat.css L340–348]** — i.e. it reserves height and fades in,
so nothing reflows on hover.

**Unified hover (a nice detail).** Hovering *either* the request row *or* the response row toggles a `group-hovered`
class on **both** rows and on the checkpoint container, via `setGroupHover` **[source: chatListRenderer.ts L1821–1846]**.
That is why the retry button lights up when you mouse over the prompt that produced it.

### C2. Keyboard shortcuts

| Action | Keybinding | When-clause | Source |
| --- | --- | --- | --- |
| `workbench.action.chat.editRequests` (*Edit Request*) | `Enter` | `inChatSession && !textInputFocus && !readOnly`, weight `WorkbenchContrib` | **[source: chatEditingActions.ts L664–668]** |
| `workbench.action.chat.undoEdits` (*Undo Requests*) | `Delete` (macOS `Cmd+Backspace`) | `inChatSession && !textInputFocus && !inQuestionCarousel && !readOnly` | **[source: chatEditingActions.ts L461–468]** |
| `workbench.action.chat.retry` (*Retry*) | **none declared** | — | **[source: chatTitleActions.ts L168–193]** |

`Enter` is not a global binding — it only fires when the transcript row (not the editor) has focus. The renderer
additionally handles `Space`/`Enter` on a focused request row to fire `_onDidClickRequest`
**[source: chatListRenderer.ts L2540–2551]**. The test plan states the intended keyboard flow explicitly: *"Via
keyboard, try entering the edits flow by navigating to a request with `shift + tab` or with `cmd + up` and `up`. Press
`enter` to begin editing … the toolbar should be accessible via `shift + tab`"* **[docs: vscode#253081]**.

### C3. Documented reasoning about the design

* **Why three edit entry points.** *"There will be a controlled rollout of different entry points to editing requests,
  which will help us gather feedback on preferential edit and undo flows."* — plus the three modes spelled out
  (`inline`: hover and select the text; `hover`: hover to reveal a toolbar with a button that edits inline; `input`:
  hover to reveal a toolbar that starts edits in the bottom input box)
  **[docs: [v1.102 release notes](https://code.visualstudio.com/updates/v1_102) L128–132]**.
* **Why `inline` won.** *"This iteration, we've made inline edits the default behavior. Click on the request bubble to
  begin editing that request."* **[docs: [v1.103 release notes](https://code.visualstudio.com/updates/v1_103) L234–242]**.
* **Why editing is coupled to checkpoints.** *"Upon submitting this change, this will remove all subsequent requests,
  undo any edits made, and send the new request in chat."* **[docs: v1.102 release notes L126]**; and *"Both features
  complement the review workflow, where you accept or reject individual edits. Use checkpoints and editing when you
  want to undo an entire batch of changes at once."* **[docs: chat-checkpoints.md L14]**.
* **Why the retry button moved.** PR [#212775](https://github.com/microsoft/vscode/pull/212775) *"Move rerun request
  back to prime spot, return with intent detection back as link"* (jrieken, 2024-05-15) — i.e. Retry was deliberately
  restored to the primary slot, while a secondary "intent detection" action was demoted to a link
  **[source: commit `7680db2a11`; PR body: "fixes microsoft/vscode-copilot#5275"]**.
* **Why retrying on an editing session prompts first.** When the last request modified files, Retry warns *"This will
  undo edits made to {0} since this request"*, restores the snapshot to the first stop, and offers a *"Don't ask
  again"* checkbox that writes `chat.editing.confirmEditRequestRetry = false`
  **[source: chatTitleActions.ts L225–252]**.
* **Feature request origin.** PR [#251732](https://github.com/microsoft/vscode/pull/251732) (*"feature: edit previous
  requests"*, justschen, merged 2025-06-24) references `microsoft/vscode-copilot#18304` and says it is *"re-adding
  all of"* [#230978](https://github.com/microsoft/vscode/pull/230978) **[source: PR body]**. The test-plan issue is
  [microsoft/vscode#253081](https://github.com/microsoft/vscode/issues/253081) **[docs]**.

---

## D. Sibling designs (secondary / observational)

**This section is secondary and observational.** Only the Zed item below was checked against source; the ChatGPT item
is a user report, not a first-party description, and OpenAI's help centre returned HTTP 403 to my fetches.

* **Zed (source-inspected).** Zed's agent panel supports editing a previous user message **in place** via
  `ActiveThread::start_editing_message(message.id, &message.segments, window, cx)`, and doing so **cancels the
  in-flight completion**: *"if the user is editing, it is likely that the current generated tokens will need to be
  regenerated anyway, so we may as well stop the current progress"*
  ([zed#29915](https://github.com/zed-industries/zed/pull/29915)). Zed's thread model also exposes a
  `Thread::truncate(...)` primitive (used for compaction), and I found **no** per-message version/alternative list in
  the thread model — so Zed's shape looks like VS Code's truncation rather than ChatGPT's branching, though I did not
  trace the edit-commit call chain end to end. There is an active user complaint that a recent release removed the
  inline editing affordance ([zed discussion #30240](https://github.com/zed-industries/zed/discussions/30240))
  **[observational]**.
* **Claude Code (docs).** Editing a prompt is not the model at all: checkpointing *"automatically captures the state
  of your code before each prompt you send that starts a turn"*, and you **rewind** to a previous state rather than
  mutate a message. Checkpoints are per-turn and limited (the 100 most recent per session); bash-command changes,
  subagent edits, and external changes are explicitly *not* restored
  ([code.claude.com/docs/en/checkpointing](https://code.claude.com/docs/en/checkpointing)) **[docs, first-party]**.
* **ChatGPT (observational only).** Editing a sent user message on the web creates a **branch**: the original and the
  edited version are both retained and the message grows left/right **version-navigation arrows** (with an "n/m"
  indicator), so you can page back to the pre-edit answer. This is *not* first-party verified here — I could not fetch
  OpenAI's release notes (HTTP 403) — but it is consistently described by users, including a February 2026 bug report
  about the arrows disappearing (*"the message version navigation arrows (the left/right arrows that appear when you
  edit a message) … Older versions of messages still exist … but the UI to access them is gone"*)
  ([community.openai.com](https://community.openai.com/t/chatgpt-web-update-removed-message-version-arrows-cannot-access-edited-message-history/1374666),
  [related](https://community.openai.com/t/restore-edit-message-history-in-chatgpt/1379404)) **[observational]**.
  **Is it worth copying?** It is a genuinely different model: VS Code/Zed buy simplicity and a single canonical
  history by destroying the old branch; ChatGPT buys non-destructiveness at the cost of a more complex transcript
  state (a message is a list of versions, and every later message must be per-version). Copy the ChatGPT model only
  if users need to *compare* two answers or recover a discarded prompt; otherwise VS Code's truncation model is far
  cheaper to implement, and VS Code already offers the escape hatch via an explicit session-level
  **Fork Conversation** rather than per-message arrows.

---

## Gaps / could not verify

1. **The originating feature request is unreachable.** `microsoft/vscode-copilot#18304` (referenced by PR #251732 and
   issue #253081) is in a repository that returns **HTTP 403** to unauthenticated requests. Any product rationale in
   that issue is not reported here.
2. **Copilot Chat extension internals were not inspected.** The UI, chat model, actions, and resend semantics are all
   in open-source `microsoft/vscode` and are verified above. `microsoft/vscode-copilot-chat` is public (it serves
   `CHANGELOG.md` and `package.json` at HTTP 200), but I did not audit its participant-side handling of `attempt`, so
   I cannot say whether the extension varies its prompt on retry. The CHANGELOG contains no retry-specific entries —
   only the mirrored 1.102/1.103 release notes **[source: vscode-copilot-chat CHANGELOG.md L956–964, L1171–1181]**.
3. **The docs URL in the brief is gone.** `https://code.visualstudio.com/docs/copilot/chat/chat-editing` returns
   **HTTP 404**; the docs were reorganised. The current home of this content is
   `docs/agents/run/review-code-edits.md` ("Edit requests and restore checkpoints")
   and the pinned historical page is `docs/copilot/chat/chat-checkpoints.md`
   **[docs: [current](https://github.com/microsoft/vscode-docs/blob/main/docs/agents/run/review-code-edits.md#L145-L195),
   [pinned](https://github.com/microsoft/vscode-docs/blob/36ba054f9d11d0c01f9f093c1faefb5123e4d110/docs/copilot/chat/chat-checkpoints.md#L16-L22)]**.
4. **No first-party ChatGPT source.** OpenAI's release-notes page returned HTTP 403; the ChatGPT branch/arrow
   description rests on user reports only and is labelled observational.
5. **The exact commit of `main` could not be pinned.** GitHub's API started returning
   `403 API rate limit exceeded` at the end of the session, so the snapshot is dated (2026-09-28) but not
   SHA-pinned. All cited line numbers are from that date's `main`.
6. **Whether editing is offered for every session type.** The feature is gated by `rendererOptions.editable`
   **[source: chatListRenderer.ts L2540, L5463]** and by `ChatContextKeys.readOnly`, and some contributed session
   types appear to disable it; I did not enumerate which harnesses set `editable: false`.
7. **The exact file-revert call on the edit-resubmit path is unverified.** I confirmed that requests at and after the
   edited request are removed from the chat model, and that `ChatEditingSession.restoreSnapshot(requestId, stopId)` is
   the revert primitive used by Retry/Restore-Checkpoint/Undo **[source: chatTitleActions.ts L249–252;
   chatEditingActions.ts L438, L652]**. I did **not** find a `restoreSnapshot` call or a `removeRequest` observer on
   the edit-resubmit path itself, so I cannot say from source *where* the documented file revert
   **[docs: chat-checkpoints.md L18]** is triggered. Do not treat "editing a request reverts that request's file
   edits" as source-verified — it is docs-verified only.