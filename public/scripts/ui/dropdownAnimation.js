document.addEventListener("DOMContentLoaded", () => {
  initDropdowns();
});

async function initDropdowns() {
  const dropdowns = document.querySelectorAll(".dropdown");
  dropdowns.forEach(dropdown => {
    const summary = dropdown.querySelector("summary");
    const content = dropdown.querySelector(".dropdown-content");
    const icon = dropdown.querySelector(".dropdown-icon");

    // Initial state
    content.style.maxHeight = "0px";
    content.style.transition = "max-height 0.35s ease";

    summary.addEventListener("click", async (e) => {
      e.preventDefault();
      if (dropdown.open) {
        await closeDropdown(dropdown, content, icon);
        } else {
          await openDropdown(dropdown, content, icon);
        }
    });
  });
}

async function openDropdown(dropdown, content, icon) {
  dropdown.open = true;
  icon.style.transform = "rotate(180deg)";
  await waitFrame();
  content.style.maxHeight = content.scrollHeight + "px";
}

async function closeDropdown(dropdown, content, icon) {
  content.style.maxHeight = content.scrollHeight + "px";
  await waitFrame();
  icon.style.transform = "rotate(0deg)";
  content.style.maxHeight = "0px";
  await waitForTransition(content);
  dropdown.open = false;
  
}

function waitForTransition(element) {
  return new Promise(resolve => {
    const handler = () => {
      element.removeEventListener("transitionend", handler);
      resolve();
    };
    element.addEventListener("transitionend", handler);
  });
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function waitFrame() {
  return new Promise(resolve => requestAnimationFrame(resolve));
}