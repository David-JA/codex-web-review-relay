"use strict";
const status = document.querySelector("#status");
async function call(kind) {
  try { status.textContent = JSON.stringify(await chrome.runtime.sendMessage({kind}), null, 2); }
  catch (error) { status.textContent = JSON.stringify({ok: false, error: error.message}, null, 2); }
}
document.querySelector("#arm").addEventListener("click", () => call("POPUP_ARM"));
document.querySelector("#disarm").addEventListener("click", () => call("POPUP_DISARM"));
document.querySelector("#check").addEventListener("click", () => call("POPUP_CHECK_PAGE"));
call("POPUP_STATUS");
