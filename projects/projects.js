import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');

const projectsContainer = document.querySelector('.projects');

const titleElement = document.querySelector('.projects-title');

if (titleElement) {
    titleElement.textContent = `${projects.length} Projects`;
}

renderProjects(projects, projectsContainer, 'h2', false);

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);

let selectedIndex = -1;
let selectedYear = '';
let query = '';

function renderPieChart(projectsGiven) {
    // Get data
    let rolledData = d3.rollups(
        projectsGiven,
        v => v.length,
        d => d.year,
    );

    let data = rolledData.map(([year, count]) => {
        return { value: count, label: year };
    });
    data.sort((a, b) => a.label - b.label);

    let colors = d3.scaleOrdinal(d3.schemeTableau10);
    let sliceGenerator = d3.pie().value((d) => d.value);
    let arcData = sliceGenerator(data);
    let arcs = arcData.map((d) => arcGenerator(d));

    let pie = d3.select('svg'); 
    pie.selectAll('path').remove(); // reset the pie chart

    let legend = d3.select('.legend');
    legend.selectAll('li').remove(); // reset the legend

    // Check if there is no data
    if (arcs.length === 0) {
        // Hide the pie chart, legend, and search bar
        pie.style('visibility', 'hidden');
        legend.style('visibility', 'hidden');
        document.querySelector('.searchBar').style.visibility = 'hidden';
        if (query !== '') {
            if (selectedYear !== '') {
                projectsContainer.innerHTML = `
                <article>
                    <h2>No Projects Found...</h2> 
                    <p><b>Searched for:</b> ${query} <br><b>In year:</b> ${selectedYear}</p>
                </article>`;
            } else {
                projectsContainer.innerHTML = `
                <article>
                    <h2>No Projects Found...</h2> 
                    <p><b>Searched for:</b> ${query}</p>
                </article>`;
            }
        }
        document.querySelector('.resetProject').style.visibility = 'visible';
        return;
    } else {
        pie.style('visibility', 'visible');
        legend.style('visibility', 'visible');
        document.querySelector('.searchBar').style.visibility = 'visible';
        document.querySelector('.resetProject').style.visibility = 'hidden';
    }

    // Generate pie chart
    arcs.forEach(arc => {
        let index = arcs.indexOf(arc);

        pie.append('path')
            .attr('d', arc)
            .attr('fill', colors(index))
            .on('click', () => {
                if (arcs.length === 1) {
                    pie.selectAll('path')
                    .attr('class', '');
                    renderPieChart(projects);
                    renderProjects(projects, projectsContainer, 'h2', false);
                    if (titleElement) {
                        titleElement.textContent = `${projects.length} Project`;
                    }
                    searchInput.value = '';
                    selectedIndex = -1;
                    selectedYear = '';
                    return;
                }

                // Toggle selected index
                selectedIndex = selectedIndex === index ? -1 : index;

                // Update selected year
                if (selectedIndex === -1) {
                    selectedYear = '';
                } else {
                    selectedYear = arcData[selectedIndex].data.label;
                }

                pie.selectAll('path')
                .attr('class', (_, idx) => (
                    // Filter idx to find correct pie slice and apply CSS from above
                    idx === selectedIndex ? 'selected' : ''
                ));

                legend.selectAll('li')
                .attr('class', (_, idx) => (
                    // Filter idx to find correct legend and apply CSS from above
                    idx === selectedIndex ? 'selected' : 'legend-item'
                ));

                if (selectedYear === '') {
                    renderProjects(projectsGiven, projectsContainer, 'h2');
                    if (titleElement) {
                        if (projectsGiven.length === 1){
                            titleElement.textContent = `${projectsGiven.length} Project`;
                        } else{
                            titleElement.textContent = `${projectsGiven.length} Projects`;
                        }
                    }
                } else {
                    let yearProjects = projectsGiven.filter((project) => {
                        return project.year === selectedYear;
                    });
                    renderProjects(yearProjects, projectsContainer, 'h2');
                    if (titleElement) {
                        if (yearProjects.length === 1){
                            titleElement.textContent = `${yearProjects.length} Project`;
                        } else{
                            titleElement.textContent = `${yearProjects.length} Projects`;
                        }
                    }
                }
            });
    });
    
    // Generate legend
    data.forEach((d, idx) => {
        legend.append('li')
            .attr('style', `--color:${colors(idx)}`) // set the style attribute while passing in parameters
            .attr('class', 'legend-item')
            .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`) // set the inner html of <li>
    })

    if (arcs.length === 1) {
        selectedIndex = 0;
        pie.selectAll('path')
        .attr('class', (_, idx) => (
            idx === selectedIndex ? 'selected' : ''
        ));

        legend.selectAll('li')
        .attr('class', (_, idx) => (
            idx === selectedIndex ? 'selected' : 'legend-item'
        ));
    }
}
renderPieChart(projects);

// Search functionality
let searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('change', (event) => {
    // update query value
    query = event.target.value;

    if (query === '') {
        let filteredProjects = projects;
        if (selectedYear !== '') {
            filteredProjects = filteredProjects.filter((project) => {
                return project.year === selectedYear;
            });
        }
        renderProjects(filteredProjects, projectsContainer, 'h2', false);
        renderPieChart(filteredProjects);
        if (titleElement) {
            if (filteredProjects.length === 1){
                titleElement.textContent = `${filteredProjects.length} Project`;
            } else{
                titleElement.textContent = `${filteredProjects.length} Projects`;
            }
        }
    }
    else {
        if (selectedYear !== '') {
            let filteredProjects = projects.filter((project) => {
                return project.year === selectedYear;
            }).filter((project) => {
                let values = Object.values(project).join('\n').toLowerCase();
                return values.includes(query.toLowerCase());
            });

            // render filtered projects
            renderProjects(filteredProjects, projectsContainer, 'h2', false);
            renderPieChart(filteredProjects);
            if (titleElement) {
                if (filteredProjects.length === 1){
                    titleElement.textContent = `${filteredProjects.length} Project`;
                } else{
                    titleElement.textContent = `${filteredProjects.length} Projects`;
                }
            }
        } else {
            // filter the projects
            let filteredProjects = projects.filter((project) => {
                let values = Object.values(project).join('\n').toLowerCase();
                return values.includes(query.toLowerCase());
            });

            // render filtered projects
            renderProjects(filteredProjects, projectsContainer, 'h2', false);
            renderPieChart(filteredProjects);
            if (titleElement) {
                if (filteredProjects.length === 1){
                    titleElement.textContent = `${filteredProjects.length} Project`;
                } else{
                    titleElement.textContent = `${filteredProjects.length} Projects`;
                }
            }
        }
    }
});

// Reset search functionality
let resetButton = document.querySelector('.resetProject');

resetButton.addEventListener('click', () => {
    location.reload();
});