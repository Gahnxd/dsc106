import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

let data = [];
let commits = d3.groups(data, (d) => d.commit);

function processCommits() {
    commits = d3
        .groups(data, (d) => d.commit)
        .map(([commit, lines]) => {
            let first = lines[0];

            // We can use object destructuring to get these properties
            let { author, date, time, timezone, datetime } = first;

            let ret =  {
                id: commit,
                url: 'https://github.com/Gahnxd/dsc106/commit/' + commit,
                author,
                date,
                time,
                timezone,
                datetime,
                // Calculate hour as a decimal for time analysis
                hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
                // How many lines were modified
                totalLines: lines.length,
            };

            Object.defineProperty(ret, 'lines', {
                value: lines,
                enumerable: false,         // Prevent it from showing up in enumeration
                configurable: false,       // Prevent deletion or redefinition
                writable: false,           // Make it read-only
            });

            return ret;
        });
}

function displayStats() {
    // Process commits first
    processCommits();
  
    // Create the dl element
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');

    // Add total commits
    dl.append('dt').text('Commits');
    dl.append('dd').text(commits.length);

    // Add total authors
    dl.append('dt').text('Authors');
    dl.append('dd').text(d3.rollups(data, (v) => v.length, (d) => d.author).length);
  
    // Add total LOC
    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);

    // Add total files
    dl.append('dt').text('Total files');
    dl.append('dd').text(d3.rollups(data, (v) => v.length, (d) => d.file).length);

    // Add longest line
    dl.append('dt').text('Longest line');
    dl.append('dd').text(d3.max(data, (d) => d.length));

    // Add total lines
    dl.append('dt').text('Total lines');
    dl.append('dd').text(d3.sum(data, (d) => d.line));

    // Add latest date
    dl.append('dt').text('Latest date');
    dl.append('dd').text(d3.max(data, (d) => d.date).toLocaleDateString());

    // Add latest time
    dl.append('dt').text('Latest time');
    dl.append('dd').text(d3.max(data, (d) => d.time).toLocaleString());
}

async function loadData() {
    data = await d3.csv('loc.csv', (row) => ({
      ...row,
      line: Number(row.line), // or just +row.line
      depth: Number(row.depth),
      length: Number(row.length),
      date: new Date(row.date + 'T00:00' + row.timezone),
      datetime: new Date(row.datetime),
    }));

    displayStats();
}

let xScale, yScale;

// Plot
function createScatterplot(){
    const width = 1000;
    const height = 600;
    
    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    let beforeFirstCommit = new Date(d3.min(commits, (d) => d.datetime)).getTime() - 48 * 60 * 60 * 1000;
    let afterLastCommit = new Date(d3.max(commits, (d) => d.datetime)).getTime() + 48 * 60 * 60 * 1000;
    
    xScale = d3
        .scaleTime()
        // .domain(d3.extent(commits, (d) => d.datetime)) // Original xScale
        .domain([beforeFirstCommit, afterLastCommit]) // xScale with extra day before first commit
        .range([0, width])
        .nice();
    
    yScale = d3
        .scaleLinear()
        .domain([0, 24])
        .range([height, 0]);
    
    const dots = svg.append('g').attr('class', 'dots');

    const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
    
    dots.selectAll('circle')
        .data(sortedCommits)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', 5)
        .attr('fill', 'steelblue');

    // Add axes
    const margin = { top: 10, right: 10, bottom: 30, left: 20 };

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };
      
    // Update scales with new ranges
    xScale.range([usableArea.left, usableArea.right]);
    yScale.range([usableArea.bottom, usableArea.top]);

    const totalDays = Math.ceil((afterLastCommit - beforeFirstCommit) / (1000 * 60 * 60 * 24));

    // Create the axes
    const xAxis = d3.axisBottom(xScale)
        .tickFormat(d3.timeFormat('%b %d'))
        .ticks(d3.timeDay.every(Math.round(totalDays/10)));
    const yAxis = d3.axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

    // Add X axis
    svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(xAxis);

    // Add Y axis
    svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

    // Add gridlines BEFORE the axes
    const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .attr('stroke-width', 1.5);

    // Create gridlines as an axis with no labels and full-width ticks
    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

    // Add color to gridlines based on time of day
    gridlines.selectAll('.tick line').attr('stroke', (d) => (d % 24 >= 6 && d % 24 <= 18 ? 'red' : 'steelblue'));

    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([5, 20]);


    // Add tooltip
    dots.selectAll('circle')
        .attr('r', (d) => rScale(d.totalLines))
        .style('fill-opacity', 0.7) // Add transparency for overlapping dots
        .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget).style('fill-opacity', 1); // Full opacity on hover
            updateTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', () => {
            d3.select(event.currentTarget).style('fill-opacity', 0.7); // Restore transparency
            updateTooltipContent({}); // Clear tooltip content
            updateTooltipVisibility(false);
        });
};

// Tooltip
function updateTooltipContent(commit) {
    const link = document.getElementById('commit-link');
    const date = document.getElementById('commit-date');
    const time = document.getElementById('commit-time');
    const author = document.getElementById('commit-author');
    const linesEdited = document.getElementById('commit-lines-edited');

    if (Object.keys(commit).length === 0) return;

    link.href = commit.url;
    link.textContent = commit.id;
    date.textContent = commit.datetime?.toLocaleString('en', {
        dateStyle: 'full',
    });
    time.textContent = commit.datetime?.toLocaleString('en', {
        timeStyle: 'short',
    });
    author.textContent = commit.author;
    linesEdited.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
}

// Brush
function brushSelector() {
    const svg = document.querySelector('svg');
    d3.select(svg).call(d3.brush().on('start brush end', brushed));
    d3.select(svg).selectAll('.dots, .overlay ~ *').raise();
}

let brushSelection = null;

function brushed(event) {
    brushSelection = event.selection;
    updateSelection();
    let selectedCommits = updateSelectionCount();
    updateLanguageBreakdown();

    const statsBox = document.getElementById('stats-box');
    if (selectedCommits.length > 0) {
        statsBox.classList.add('selected-box');
    } else {
        statsBox.classList.remove('selected-box');
    }
}

function isCommitSelected(commit) {
    if (!brushSelection) return false; 
    const min = { x: brushSelection[0][0], y: brushSelection[0][1] }; 
    const max = { x: brushSelection[1][0], y: brushSelection[1][1] }; 
    const x = xScale(commit.date); 
    const y = yScale(commit.hourFrac); 
    return x >= min.x && x <= max.x && y >= min.y && y <= max.y; 
}

function updateSelection() {
    // Update visual state of dots based on selection
    d3.selectAll('circle').classed('selected', (d) => isCommitSelected(d));
}

function updateSelectionCount() {
    const selectedCommits = brushSelection
      ? commits.filter(isCommitSelected)
      : [];
  
    const countElement = document.getElementById('selection-count');
    countElement.textContent = `${
      selectedCommits.length || 'No'
    } commits selected`;
  
    return selectedCommits;
}

function updateLanguageBreakdown() {
    const selectedCommits = brushSelection
      ? commits.filter(isCommitSelected)
      : [];
    const container = document.getElementById('language-breakdown');
  
    if (selectedCommits.length === 0) {
      container.innerHTML = '';
      return;
    }
    const requiredCommits = selectedCommits.length ? selectedCommits : commits;
    const lines = requiredCommits.flatMap((d) => d.lines);
  
    // Use d3.rollup to count lines per language
    const breakdown = d3.rollup(
      lines,
      (v) => v.length,
      (d) => d.type
    );
  
    // Update DOM with breakdown
    container.innerHTML = '';
  
    for (const [language, count] of breakdown) {
      const proportion = count / lines.length;
      const formatted = d3.format('.1~%')(proportion);
  
      container.innerHTML += `
              <dt>${language}</dt>
              <dd>${count} lines (${formatted})</dd>
          `;
    }
  
    return breakdown;
  }

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    createScatterplot();
    brushSelector();
});