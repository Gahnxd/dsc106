import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

let data = [];
let commits = d3.groups(data, (d) => d.commit);
let commitProgress = 100;
let filteredCommits = [];
let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);

let NUM_ITEMS =  commits.length; // Ideally, match this to the length of your commit history
let ITEM_HEIGHT = 80;
let VISIBLE_COUNT = 8; // Number of visible items at a time
let totalHeight = (NUM_ITEMS - 1) * ITEM_HEIGHT;

const scrollContainer = d3.select("#scroll-container1");
const spacer = d3.select("#spacer");
spacer.style("height", `${totalHeight}px`);
const itemsContainer = d3.select("#items-container1");

scrollContainer.on("scroll", () => {
    const scrollTop = scrollContainer.property("scrollTop");
    let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
    renderItems(startIndex);
});

const fileScrollContainer = d3.select("#scroll-container2");
const fileItemsContainer = d3.select("#items-container2");

fileScrollContainer.on("scroll", () => {
    const scrollTop = fileScrollContainer.property("scrollTop");
    let startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
    startIndex = Math.max(0, Math.min(startIndex, commits.length - VISIBLE_COUNT));
    renderFileItems(startIndex);
});

function renderItems(startIndex) {
    // Clear previous items
    itemsContainer.selectAll("div").remove();

    const endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);

    // sort commits by date
    let sorted = commits.sort((a, b) => a.datetime - b.datetime);

    let newCommitSlice = sorted.slice(0, endIndex);

    let commitDivs = itemsContainer.selectAll("div")
        .data(sorted)
        .enter()
        .append("div")
        .attr("class", "item")
        .style("position", "absolute")
        .style("top", (_, idx) => `${idx * ITEM_HEIGHT}px`)

    // Append narrative paragraph to each commit
    commitDivs.append("p")
        .html(d => {
            const dateTime = d.datetime.toLocaleString("en", {dateStyle: "full", timeStyle: "full"});
            const parts = dateTime.split(' at'); // Split date and time parts
            const datePart = parts.slice(0, -1); // Everything except the last part (time)
            const timePart = parts[parts.length - 1]; // The last part (time)
            
            return `
                On <b>${datePart}</b> at ${timePart},
                ${d.author} made commit <a href="${d.url}" target="_blank">${d.id}</a> :
                <b>${d.totalLines} lines</b> were edited across 
                <b>${ d3.rollups(d.lines, D => D.length, d => d.file).length } files</b>. 
            `;
        });

    let maxTime = sorted[endIndex - 1].datetime;

    displayStats(newCommitSlice.length, maxTime);

    // Update the scatterplot based on scrolling commits
    createScatterplot(newCommitSlice);
}

function renderFileItems(startIndex) {
    // Clear previous items
    fileItemsContainer.selectAll("div").remove();

    const endIndex = Math.min(startIndex + VISIBLE_COUNT, commits.length);

    // sort commits by date
    let sorted = commits.sort((a, b) => a.datetime - b.datetime);

    let newFileSlice = sorted.slice(0, endIndex);

    let fileDivs = fileItemsContainer.selectAll("div")
        .data(sorted)
        .enter()
        .append("div")
        .attr("class", "item")
        .style("position", "absolute")
        .style("top", (_, idx) => `${idx * ITEM_HEIGHT}px`)
        
    // Append narrative paragraph to each commit
    fileDivs.append("p")
        .html(d => {
            const dateTime = d.datetime.toLocaleString("en", {dateStyle: "full", timeStyle: "full"});
            const parts = dateTime.split(' at'); // Split date and time parts
            const datePart = parts.slice(0, -1); // Everything except the last part (time)
            const timePart = parts[parts.length - 1]; // The last part (time)
            
            return `
                On <b>${datePart}</b> at ${timePart},
                ${d.author} made commit <a href="${d.url}" target="_blank">${d.id}</a> :
                <b>${d.totalLines} lines</b> were edited across 
                <b>${ d3.rollups(d.lines, D => D.length, d => d.file).length } files</b>. 
            `;
        });

    // Ensure file-based visualization updates correctly
    updateFileList(newFileSlice);
}


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
                datetime : new Date(datetime),
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

    NUM_ITEMS = commits.length;
}

function displayStats(numCommits = commits.length, commitMaxTime = d3.max(commits, d => d.datetime)) {
    // Process commits first
    processCommits();

    // Clear existing stats
    d3.select('.stats').remove();

    let filteredData = data.filter(d => d.datetime <= commitMaxTime);
  
    // Create the dl element
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');

    // console.log('numCommits', numCommits);
    // console.log('commitMaxTime', commitMaxTime);

    // Add total commits
    dl.append('dt').text('Commits');
    dl.append('dd').text(numCommits);

    // Add total authors
    dl.append('dt').text('Authors');
    dl.append('dd').text(d3.rollups(filteredData, (v) => v.length, (d) => d.author).length);
  
    // Add total LOC
    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(filteredData.length);

    // Add total files
    dl.append('dt').text('Total files');
    dl.append('dd').text(d3.rollups(filteredData, (v) => v.length, (d) => d.file).length);

    // Add longest line
    dl.append('dt').text('Longest line');
    dl.append('dd').text(d3.max(filteredData, (d) => d.length));

    // Add total lines
    dl.append('dt').text('Total lines');
    dl.append('dd').text(d3.sum(filteredData, (d) => d.line));

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

    filterCommitsByTime();
    displayStats();
    timeScale = d3.scaleTime()
        .domain([d3.min(commits, d => d.datetime), d3.max(commits, d => d.datetime)])
        .range([0, 100]);
}

let xScale, yScale, timeScale, commitMaxTime;

timeScale = d3.scaleTime()
        .domain([d3.min(commits, d => d.datetime), d3.max(commits, d => d.datetime)])
        .range([0, 100]);

function filterCommitsByTime() {
    commitMaxTime = timeScale.invert(commitProgress);
    filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);
}

function updateFileList(filteredCommits) {
    let lines = filteredCommits.flatMap(d => d.lines);
    let files = d3.groups(lines, d => d.file)
        .map(([name, lines]) => ({ name, lines }));

    // Sort by number of lines
    files = d3.sort(files, (d) => -d.lines.length);

    // Use data join pattern
    const filesContainer = d3.select('.files')
        .selectAll('div')
        .data(files, d => d.name);
        
    // EXIT - Remove files that no longer exist
    filesContainer.exit()
        .transition()
        .duration(150)
        .style('opacity', 0)
        .style('height', 0)
        .remove();
        
    // ENTER - Create new elements for new files
    const enterFiles = filesContainer.enter()
        .append('div')
        .style('opacity', 0)
        .style('transform', 'translateY(10px)')
        // Add a data attribute to track original position
        .attr('data-original-index', (_, i) => 0);
    
    // Add filename to new files
    enterFiles.append('dt')
        .append('code')
        .text(d => d.name);
    
    // Add dots container to new files    
    enterFiles.append('dd');
    
    // Animate new files in
    enterFiles
        .transition()
        .duration(150)
        .style('opacity', 1)
        .style('transform', 'translateY(0)');
    
    // UPDATE + ENTER - Handle all files
    const allFiles = enterFiles.merge(filesContainer);
    
    // Update file names and counts
    allFiles.select('dt code')
        .text(d => d.name);
    
    // Update dots in each file (simplified for reliability)
    let maxDotsCount = 0;
    allFiles.select('dd').each(function(d) {
        const dotsContainer = d3.select(this);
        maxDotsCount = Math.max(maxDotsCount, d.lines.length);
        
        // Clear and rebuild dots for reliability
        dotsContainer.selectAll('.line').remove();
        
        // Add all dots at once (more reliable than complex transitions)
        dotsContainer.selectAll('.line')
            .data(d.lines)
            .enter()
            .append('div')
            .attr('class', 'line')
            .style('background', l => l.type ? fileTypeColors(l.type) : '#888888')
            .style('transform', 'scale(0)')
            .style('opacity', 0)
            .transition()
            .duration(150)
            .delay((_, i) => Math.min(i * 1, 100))
            .style('transform', 'scale(1)')
            .style('opacity', 1);
    });

    // Calculate delay based on number of dots (more dots = slightly longer delay)
    const sortDelay = Math.min(150 + maxDotsCount * 1, 300);
    
    // SORTING ANIMATION with visual highlight
    setTimeout(() => {
        // First, highlight rows that will move
        allFiles.each(function(d, i) {
            const originalIndex = +d3.select(this).attr('data-original-index');
            // console.log(d.name, 'originalIndex', originalIndex, 'new index', i);
            if (originalIndex !== i) {                
                d3.select(this).select('dt')
                    .transition()
                    .duration(100)
                    .style('background-color', 'rgba(50, 165, 251, 0.3)')
                    .style('border-radius', '3px')
                    .style('padding', '2px');

                // console.log('highlighted', d.name);
            }
        });
        
        // Then after a small delay, do the actual sorting
        setTimeout(() => {
            // Apply sorting with transition
            allFiles.each(function(d, i) {
                // Store current y position
                const currentY = this.getBoundingClientRect().top;
                
                // Set the order based on sorted position
                d3.select(this)
                    .style('position', 'relative')
                    .attr('data-original-index', i)
                    .transition()
                    .duration(300)
                    .delay(i * 100) // Stagger the sort animation
                    .style('order', i)
                    .style('background-color', 'transparent')
                    .style('transform', 'translateY(0)')
                    .on('end', function() {
                        // Remove highlight when done
                        d3.select(this).select('dt')
                            .style('background-color', null)
                            .style('border-radius', null)
                            .style('padding', null);
                    });

                // console.log('sorted', d.name, 'to', i);
            });
        }, 300);
    }, sortDelay);
}

// Plot
function createScatterplot(filteredCommits) {
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 20 };

    // Use existing SVG if it exists, otherwise create a new one
    let svg = d3.select('#chart').select('svg');
    if (svg.empty()) {
        svg = d3.select('#chart')
            .append('svg')
            .attr('viewBox', `0 0 ${width} ${height}`)
            .style('overflow', 'visible');
    }

    // Set up the usable area
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    // Calculate date range (with padding)
    let beforeFirstCommit, afterLastCommit;
    
    if (filteredCommits.length > 0) {
        beforeFirstCommit = new Date(d3.min(filteredCommits, d => d.datetime));
        beforeFirstCommit = new Date(beforeFirstCommit.getTime() - 2 * 24 * 60 * 60 * 1000);
        
        afterLastCommit = new Date(d3.max(filteredCommits, d => d.datetime));
        afterLastCommit = new Date(afterLastCommit.getTime() + 2 * 24 * 60 * 60 * 1000);
    } else {
        // Fallback if no commits
        beforeFirstCommit = new Date();
        afterLastCommit = new Date();
    }

    // Set up scales
    xScale = d3
        .scaleTime()
        .domain([beforeFirstCommit, afterLastCommit])
        .range([usableArea.left, usableArea.right])
        .nice();
    
    yScale = d3
        .scaleLinear()
        .domain([0, 24])
        .range([usableArea.bottom, usableArea.top]);

    // Create circle size scale
    const rScale = d3.scaleSqrt()
        .domain([1, d3.max(filteredCommits, d => d.totalLines) || 1])
        .range([3, 20]);

    // Create or select the dots container
    let dotsGroup = svg.select('.dots');
    if (dotsGroup.empty()) {
        dotsGroup = svg.append('g').attr('class', 'dots');
    }

    // Sort commits by total lines (larger circles are drawn first)
    const sortedCommits = d3.sort(filteredCommits, d => -d.totalLines);
    
    // Update the circles with animation
    dotsGroup.selectAll('circle')
        .data(sortedCommits, d => d.id) // Use commit ID as key function
        .join(
            // ENTER: New circles appear with grow animation
            enter => enter.append('circle')
                .attr('cx', d => xScale(d.datetime))
                .attr('cy', d => yScale(d.hourFrac))
                .attr('r', 0) // Start small
                .attr('fill', 'steelblue')
                .style('fill-opacity', 0.7)
                .call(enter => enter.transition()
                    .duration(600)
                    .attr('r', d => rScale(d.totalLines))),
            
            // UPDATE: Existing circles transition to new positions/sizes
            update => update.call(update => update.transition()
                .duration(600)
                .attr('cx', d => xScale(d.datetime))
                .attr('cy', d => yScale(d.hourFrac))
                .attr('r', d => rScale(d.totalLines))),
            
            // EXIT: Remove circles with shrink animation
            exit => exit.call(exit => exit.transition()
                .duration(600)
                .attr('r', 0)
                .style('fill-opacity', 0)
                .remove())
        )
        .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget)
                .transition()
                .duration(150)
                .style('fill-opacity', 1);
            
            updateTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', (event) => {
            d3.select(event.currentTarget)
                .transition()
                .duration(150)
                .attr('fill', 'steelblue') // Change back to original color
                .style('fill-opacity', 0.7);
                
            updateTooltipVisibility(false);
        });

    // Remove previous axes
    svg.selectAll('.axis').remove();

    // Calculate tick values for x-axis
    const totalDays = Math.ceil((afterLastCommit - beforeFirstCommit) / (1000 * 60 * 60 * 24));
    let dayStep = 1;
    if (totalDays > 10) {
        dayStep = Math.ceil(totalDays / 15); 
    }

    // Create axes
    const xAxis = d3.axisBottom(xScale)
        .tickValues(d3.timeDay.range(beforeFirstCommit, afterLastCommit, dayStep))
        .tickFormat(d3.timeFormat('%b %d'));
    
    const yAxis = d3.axisLeft(yScale)
        .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

    // Add X axis
    svg.append('g')
        .attr('class', 'axis x-axis')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(xAxis);

    // Add Y axis
    svg.append('g')
        .attr('class', 'axis y-axis')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(yAxis);
        
    // Add subtle grid lines
    svg.selectAll('.grid-line-x').remove();
    svg.selectAll('.grid-line-y').remove();
    
    // Add horizontal grid lines
    svg.selectAll('.grid-line-x')
        .data(yScale.ticks(12))
        .enter()
        .append('line')
        .attr('class', 'grid-line-x')
        .attr('x1', usableArea.left)
        .attr('x2', usableArea.right)
        .attr('y1', d => yScale(d))
        .attr('y2', d => yScale(d))
        .attr('stroke', d => (d >= 6 && d <= 18) ? '#ffcccc' : '#cce5ff')  // Red during day (6am-6pm), blue during night
        .attr('stroke-width', 2);      // Slightly thicker lines at 6am/6pm
        
    // Add vertical grid lines
    svg.selectAll('.grid-line-y')
        .data(xScale.ticks(totalDays > 30 ? 15 : totalDays))
        .enter()
        .append('line')
        .attr('class', 'grid-line-y')
        .attr('y1', usableArea.top)
        .attr('y2', usableArea.bottom)
        .attr('x1', d => xScale(d))
        .attr('x2', d => xScale(d))
        .attr('stroke', '#e0e0e0')
        .attr('stroke-width', 0);

    updateSelection();
    selectedCommits = updateSelectionCount(sortedCommits);
    // console.log('shown: ', sortedCommits.length);
    // console.log('highlighted: ', selectedCommits.length);
    updateLanguageBreakdown();

    const statsBox = document.getElementById('stats-box');
    if (selectedCommits.length > 0) {
        statsBox.classList.add('selected-box');
    } else {
        statsBox.classList.remove('selected-box');
    }
}

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
let selectedCommits = [];


function brushed(event) {
    brushSelection = event.selection;
    updateSelection();
    selectedCommits = updateSelectionCount(commits);
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
    let min = { x: brushSelection[0][0], y: brushSelection[0][1] }; 
    let max = { x: brushSelection[1][0], y: brushSelection[1][1] }; 
    let x = xScale(commit.date); 
    let y = yScale(commit.hourFrac); 
    return x >= min.x && x <= max.x && y >= min.y && y <= max.y; 
}

function updateSelection() {
    // Update visual state of dots based on selection
    d3.selectAll('circle').classed('selected', (d) => isCommitSelected(d));
}

function updateSelectionCount(commits) {
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
    renderItems(0); // Start Scrollytelling with the first batch of commits
    renderFileItems(0); // Load files scrollytelling with the first batch of files
    filterCommitsByTime();
    // createScatterplot(filteredCommits);
    // displayCommitFiles(filteredCommits);
    // d3.select("#selectedTime").text(timeScale.invert(commitProgress).toLocaleString());
    // document.getElementById("commit-slider").addEventListener("input", (event) => {
    //     commitProgress = Number(event.target.value);
    //     filterCommitsByTime();
    //     createScatterplot(filteredCommits);
    //     d3.select("#selectedTime").text(timeScale.invert(commitProgress).toLocaleString());
    // });
    brushSelector();
});