const CONFIG = window.APP_CONFIG;
const t = window.TrelloPowerUp.iframe({ appKey: CONFIG.appKey, appName: CONFIG.appName, appAuthor: CONFIG.appAuthor });
const state = { items: [], status: "all", search: "", mine: false, currentMemberId: null, loading: false };
const els = Object.fromEntries(["auth","content","authorize","refresh","search","mine","rows","empty","loading","error","status","subtitle"].map(id => [id, document.getElementById(id)]));
let apiClient;

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    apiClient = await t.getRestApi();
    if (!(await apiClient.isAuthorized())) return showAuth();
    await load();
  } catch (error) { showError(error); }
}

function showAuth() {
  els.loading.classList.add("hidden");
  els.content.classList.add("hidden");
  els.auth.classList.remove("hidden");
}

els.authorize.addEventListener("click", async () => {
  els.authorize.disabled = true;
  els.authorize.textContent = "Authorizing…";
  try {
    await apiClient.authorize({ scope: "read,write", expiration: "never" });
    els.auth.classList.add("hidden");
    await load();
  } catch (error) { showError(error); }
  finally { els.authorize.disabled = false; els.authorize.textContent = "Authorize Trello access"; }
});

els.refresh.addEventListener("click", load);
els.search.addEventListener("input", () => { state.search = els.search.value.trim().toLowerCase(); render(); });
els.mine.addEventListener("change", () => { state.mine = els.mine.checked; render(); });

document.querySelectorAll("[data-status]").forEach(button => {
  button.addEventListener("click", () => {
    state.status = button.dataset.status;
    document.querySelectorAll("[data-status]").forEach(b => b.classList.toggle("active", b === button));
    render();
  });
});

async function load() {
  if (state.loading) return;
  state.loading = true;
  els.error.classList.add("hidden");
  els.loading.classList.remove("hidden");
  els.content.classList.add("hidden");
  try {
    // A board-level modal has no card context. Fetch board data through REST.
    const boardId = await t.board("id");
    const token = await apiClient.getToken();
    if (!boardId?.id || !token) throw new Error("Unable to identify the board or access Trello. Please reauthorize.");

    async function getBoardResource(path) {
      const url = new URL(`https://api.trello.com/1/boards/${encodeURIComponent(boardId.id)}/${path}`);
      url.searchParams.set("key", CONFIG.appKey);
      url.searchParams.set("token", token);
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`Trello API error (${response.status}) loading ${path}: ${await response.text()}`);
      return response.json();
    }

    const [cards, lists, checklists, memberResponse] = await Promise.all([
      getBoardResource("cards?fields=id,name,url,idList"),
      getBoardResource("lists?fields=id,name"),
      getBoardResource("checklists"),
      fetch(`https://api.trello.com/1/members/me?key=${encodeURIComponent(CONFIG.appKey)}&token=${encodeURIComponent(token)}&fields=id`)
    ]);
    if (!memberResponse.ok) throw new Error(`Trello API error (${memberResponse.status}) loading member`);
    const member = await memberResponse.json();
    state.currentMemberId = member.id || null;
    const listMap = new Map(lists.map(list => [list.id, list.name]));
    const cardMap = new Map(cards.map(card => [card.id, card]));
    state.items = [];
    for (const checklist of checklists) {
      const card = cardMap.get(checklist.idCard);
      if (!card) continue;
      for (const item of (checklist.checkItems || [])) {
        state.items.push({
          id: item.id, cardId: card.id, cardName: card.name, cardUrl: card.url,
          listName: listMap.get(card.idList) || "Unknown list",
          checklistId: checklist.id, checklistName: checklist.name,
          name: item.name, state: item.state, idMember: item.idMember || null
        });
      }
    }
    els.subtitle.textContent = `${state.items.length} checklist item${state.items.length === 1 ? "" : "s"} on this board`;
    els.loading.classList.add("hidden");
    els.content.classList.remove("hidden");
    render();
  } catch (error) { showError(error); }
  finally { state.loading = false; }
}

function filteredItems() {
  return state.items.filter(item => {
    if (state.status === "open" && item.state === "complete") return false;
    if (state.status === "done" && item.state !== "complete") return false;
    if (state.mine && item.idMember !== state.currentMemberId) return false;
    if (state.search) {
      const haystack = [item.cardName, item.listName, item.checklistName, item.name].join(" ").toLowerCase();
      if (!haystack.includes(state.search)) return false;
    }
    return true;
  });
}

function render() {
  const items = filteredItems();
  els.rows.replaceChildren();
  for (const item of items) {
    const tr = document.createElement("tr");
    const doneTd = document.createElement("td");
    doneTd.className = "done-col";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "item-check";
    checkbox.checked = item.state === "complete";
    checkbox.setAttribute("aria-label", `Toggle ${item.name}`);
    checkbox.addEventListener("change", () => toggleItem(item, checkbox));
    doneTd.appendChild(checkbox);

    const cardTd = document.createElement("td");
    const cardLink = document.createElement("a");
    cardLink.className = "card-link";
    cardLink.href = item.cardUrl;
    cardLink.target = "_blank";
    cardLink.rel = "noopener noreferrer";
    cardLink.textContent = item.cardName;
    const list = document.createElement("div");
    list.className = "list-name";
    list.textContent = item.listName;
    cardTd.append(cardLink, list);

    const checklistTd = document.createElement("td");
    checklistTd.className = "checklist-name";
    checklistTd.textContent = item.checklistName;

    const itemTd = document.createElement("td");
    const itemName = document.createElement("div");
    itemName.className = "item-name" + (item.state === "complete" ? " complete" : "");
    itemName.textContent = item.name;
    itemTd.appendChild(itemName);
    if (item.idMember) {
      const assignee = document.createElement("div");
      assignee.className = "item-assignee";
      assignee.textContent = item.idMember === state.currentMemberId ? "Assigned to me" : "Assigned";
      itemTd.appendChild(assignee);
    }
    tr.append(doneTd, cardTd, checklistTd, itemTd);
    els.rows.appendChild(tr);
  }
  els.empty.classList.toggle("hidden", items.length !== 0);
  els.status.textContent = `${items.length} matching item${items.length === 1 ? "" : "s"}`;
}

async function toggleItem(item, checkbox) {
  const newState = checkbox.checked ? "complete" : "incomplete";
  checkbox.disabled = true;
  try {
    const token = await apiClient.getToken();
    if (!token) throw new Error("Trello authorization has expired. Please authorize again.");
    const url = `https://api.trello.com/1/cards/${encodeURIComponent(item.cardId)}/checkItem/${encodeURIComponent(item.id)}?key=${encodeURIComponent(CONFIG.appKey)}&token=${encodeURIComponent(token)}&state=${encodeURIComponent(newState)}`;
    const response = await fetch(url, { method: "PUT", headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Trello API error (${response.status}): ${await response.text()}`);
    item.state = newState;
    render();
  } catch (error) {
    checkbox.checked = !checkbox.checked;
    showError(error);
  } finally { checkbox.disabled = false; }
}

function showError(error) {
  console.error(error);
  els.loading.classList.add("hidden");
  els.error.classList.remove("hidden");
  els.error.textContent = error?.message || "Something went wrong while loading Trello data.";
}
