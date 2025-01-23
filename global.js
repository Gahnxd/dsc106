console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// Get all nav links
const navLinks = $$('nav a');

// Find the current link
const currentLink = navLinks.find(
    (a) =>
      a.host === location.host &&
      a.pathname === location.pathname
  );

// Add the 'current' class to the active link, if found
currentLink?.classList.add('current');