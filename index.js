import { fetchJSON, renderProjects, fetchGitHubData} from './global.js';

const projects = await fetchJSON('./lib/projects.json');

const projectsContainer = document.querySelector('.projects');

renderProjects(projects, projectsContainer, 'h3', true, 3);

const githubData = await fetchGitHubData('gahnxd');

const profileStats = document.querySelector('#profile-stats');

if (profileStats) {

    const hireable = githubData.hireable ? 'Yes!' : 'No';

    const dateObj = new Date(githubData.updated_at);
    const month   = (dateObj.getUTCMonth() + 1).toString().padStart(2,"0");
    const day     = dateObj.getUTCDate().toString().padStart(2,"0");
    const year    = dateObj.getUTCFullYear();

    profileStats.innerHTML = `
          <dl>
            <dt>Public Repos:</dt><dd>${githubData.public_repos}</dd>
            <dt>Followers:</dt><dd>${githubData.followers}</dd>
            <dt>Following:</dt><dd>${githubData.following}</dd>
            <dt>Hireable:</dt><dd>${hireable}</dd>
            <dt>Last Updated:</dt><dd>${year}/${month}/${day}</dd>
          </dl>
      `;
  }