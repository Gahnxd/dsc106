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
let filteredProjects = projects;

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

    // Generate pie chart
    arcs.forEach(arc => {
        let index = arcs.indexOf(arc);

        pie.append('path')
            .attr('d', arc)
            .attr('fill', colors(index))
            .on('click', () => {
                selectedIndex = selectedIndex === index ? -1 : index;

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

                if (selectedIndex === -1) {
                    if (selectedYear === '') {
                        renderProjects(projectsGiven, projectsContainer, 'h2');
                    } else {
                        let yearProjects = projectsGiven.filter((project) => {
                            return project.year === selectedYear;
                        });
                        renderProjects(yearProjects, projectsContainer, 'h2');
                    }
                } else {
                    if (selectedYear === '') {
                        renderProjects(projectsGiven, projectsContainer, 'h2');
                    } else {
                        let yearProjects = projectsGiven.filter((project) => {
                            return project.year === selectedYear;
                        });
                        renderProjects(yearProjects, projectsContainer, 'h2');
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
}
renderPieChart(projects);

// Search functionality
let query = '';
let searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('change', (event) => {
    // update query value
    query = event.target.value;

    if (query === '') {
        filteredProjects = projects;
        renderPieChart(filteredProjects);
        renderProjects(filteredProjects, projectsContainer, 'h2', false);
    }
    else {
        // filter the projects
        filteredProjects = projects.filter((project) => {
            let values = Object.values(project).join('\n').toLowerCase();
            return values.includes(query.toLowerCase());
        });

        if (selectedYear !== '') {
            filteredProjects = filteredProjects.filter((project) => {
                return project.year === selectedYear;
            });
        }

        // render filtered projects
        renderPieChart(filteredProjects)
        renderProjects(filteredProjects, projectsContainer, 'h2', false);
    }
});