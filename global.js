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
    { url: 'meta/index.html', title: 'Meta' }
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

export async function fetchJSON(url) {
  try {
    // Fetch the JSON file from the given URL
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    console.log(response)

    const data = await response.json();
    return data; 


  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}

// Test function
// window.fetchJSON = fetchJSON;

export function renderProjects(project, containerElement, headingLevel = 'h2', home=false, n=project.length) {
  if (!containerElement) return; // Ensure the container is valid
  containerElement.innerHTML = ''; // Clear existing content

  if (!project || project.length == 0) {
    // Display a placeholder message if there are no projects
    containerElement.innerHTML = `<p>No projects available at the moment...</p>`;
    return;
  }

  //Sort projects by proj.year in descending order
  project.sort((a, b) => b.year - a.year);

  if (n > 0 && n < project.length){
    project = project.slice(0, n);
  }

  if (!containerElement) return; // Ensure the container is valid
  containerElement.innerHTML = ''; // Clear existing content

  if (!project || project.length == 0) {
    // Display a placeholder message if there are no projects
    containerElement.innerHTML = `<p>No projects available at the moment...</p>`;
    return;
  }

  // Loop over the projects and add them to the container
  for (let proj of project) {
    const article = document.createElement('article');

    // Validate heading level (ensure it's h1-h6)
    const validHeadings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    const headingTag = validHeadings.includes(headingLevel) ? headingLevel : 'h2';

    let projUrl = "";
    if (proj.link) {
      projUrl = "<a href='" + proj.link + "' target='_blank' class='project-link'>View</a>";
    }

    if (proj.image.toString().includes("./image")) { // Image is local
      if (home){ // 
        article.innerHTML = `
          <${headingTag}>${proj.title}</${headingTag}>
          <img src="${proj.image}" alt="${proj.title}">
          <div>
          <p>${proj.description}</p>
          <p id="year">${proj.year}</p>
          ${projUrl}
          </div>
        `;
      } else {
        article.innerHTML = `
          <${headingTag}>${proj.title}</${headingTag}>
          <img src=".${proj.image}" alt="${proj.title}">
          <div>
          <p>${proj.description}</p>
          <p id="year">${proj.year}</p>
          ${projUrl}
          </div>
        `;
      }
    } else { // Image is URL
      article.innerHTML = `
          <${headingTag}>${proj.title}</${headingTag}>
          <img src="${proj.image}" alt="${proj.title}">
          <div>
          <p>${proj.description}</p>
          <p id="year">${proj.year}</p>
          
          </div>
        `;
    }

    containerElement.appendChild(article);
  }
}

// Test function
// window.renderProjects = renderProjects;

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}