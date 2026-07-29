const statusEl = document.getElementById("status");
const whoEl = document.getElementById("who");

document.getElementById("load").addEventListener("click", async () => {
  statusEl.textContent = "Loading...";
  try {
    const res = await fetch("http://localhost:3000/api/me/profile", { credentials: "include" });
    if (!res.ok) throw new Error("Not signed in at localhost:3000");
    const profile = await res.json();
    await chrome.storage.local.set({ profile });
    whoEl.textContent = `Loaded: ${profile.firstName} ${profile.lastName} (${profile.email})`;
    statusEl.textContent = "Profile ready.";
  } catch (e) {
    statusEl.textContent = "Error: " + e.message;
  }
});

document.getElementById("fill").addEventListener("click", async () => {
  const { profile } = await chrome.storage.local.get("profile");
  if (!profile) { statusEl.textContent = "Load your profile first."; return; }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: fillForm,
    args: [profile],
  }, (results) => {
    const n = results?.[0]?.result ?? 0;
    statusEl.textContent = `Filled ${n} field(s). Review and submit yourself.`;
  });
});

// This function runs INSIDE the job page.
function fillForm(profile) {
  const full = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  const map = [
    { sel: ["#first_name","input[name='first_name']","input[autocomplete='given-name']","input[data-automation-id*='firstName']","input[name*='firstname' i]"], val: profile.firstName },
    { sel: ["#last_name","input[name='last_name']","input[autocomplete='family-name']","input[data-automation-id*='lastName']","input[name*='lastname' i]"], val: profile.lastName },
    { sel: ["input[name='name']"], val: full },
    { sel: ["#email","input[type='email']","input[name*='email' i]","input[data-automation-id*='email']"], val: profile.email },
    { sel: ["#phone","input[type='tel']","input[name*='phone' i]","input[data-automation-id*='phone']"], val: profile.phone },
    { sel: ["input[name*='linkedin' i]"], val: profile.linkedin },
    { sel: ["input[name*='github' i]"], val: profile.github },
  ];
  let filled = 0;
  for (const { sel, val } of map) {
    if (!val) continue;
    for (const s of sel) {
      const el = document.querySelector(s);
      if (el) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(el, val);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        filled++;
        break;
      }
    }
  }
  return filled;
}