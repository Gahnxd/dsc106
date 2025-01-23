console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// Define pages for the navigation menu
let pages = [
    { url: 'index.html', title: 'Home' },
    { url: 'projects/index.html', title: 'Projects' },
    { url: 'cv/index.html', title: 'CV' },
    { url: 'contact/index.html', title: 'Contact' },
    { url: 'https://github.com/Gahnxd', title: 'Github' },
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

// Add the color scheme switch dropdown
document.body.insertAdjacentHTML(
    'afterbegin',
    `
      <label class="color-scheme">
          Theme:
          <select>
              <option value="light dark">Automatic</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
          </select>
      </label>`
  );

let select = document.querySelector('.color-scheme select');

// Check if there's a saved color scheme in localStorage on page load
if (localStorage.colorScheme) {
    document.documentElement.style.setProperty('color-scheme', localStorage.colorScheme);
    select.value = localStorage.colorScheme;
}

// Set the color scheme based on the user's preference
select.addEventListener('input', function (event) {
    console.log('color scheme changed to', event.target.value);
    document.documentElement.style.setProperty('color-scheme', event.target.value);
    localStorage.colorScheme = event.target.value
});

let form = document.querySelector('form');

// Check if form exists and add event listener
form?.addEventListener('submit', (event) => {
  event.preventDefault(); // Prevent the default form submission

  let data = new FormData(form); // Collect form data
  let params = []; // Array to store URL parameters

  // Build URL parameters with proper encoding
  for (let [name, value] of data) {
    params.push(`${name}=${encodeURIComponent(value)}`);
    console.log(name, value);
  }

  // Concatenate URL and open mail client
  let url = `${form.action}?${params.join('&')}`;
  console.log(url);
  location.href = url;
});
