console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// Define pages for the navigation menu
let pages = [
    { url: 'index.html', title: 'Home' },
    { url: 'projects/index.html', title: 'Projects' },
    { url: 'contact/index.html', title: 'Contact' },
    { url: 'https://github.com/Gahnxd', title: 'Github' },
    { url: 'cv/index.html', title: 'CV' },
];

// Create a new <nav> element and prepend it to the body
let nav = document.createElement('nav');
document.body.prepend(nav);

// Detect if we are on the home page
const ARE_WE_HOME = document.documentElement.classList.contains('home');

// Add navigation links to nav
for (let p of pages) {
    // Get the URL and title for each page
    let url = !ARE_WE_HOME && !p.url.startsWith('http') ? '../' + p.url : p.url;
    let title = p.title;
    
    // Create a new <a> element with the URL and title
    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;

    // Highlight the current page
    if (a.host === location.host && a.pathname === location.pathname) {
        a.classList.add('current');
    }

    // Open external links in a new tab
    if (a.host !== location.host) {
        a.target = '_blank';
    }

    nav.append(a);
}