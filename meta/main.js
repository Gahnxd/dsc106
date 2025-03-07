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

    let newCommitSlice = sorted.slice(startIndex, endIndex);

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

function displayCommitFiles(filteredCommits) {
    const lines = filteredCommits.flatMap(d => d.lines);
    let fileTypeColors = d3.scaleOrdinal(d3.schemeTableau10);

    let files = d3.groups(lines, (d) => d.file)
        .map(([name, lines]) => ({ name, lines }))
        .sort((a, b) => b.lines.length - a.lines.length);

    d3.select(".files").selectAll("div").remove();

    let filesContainer = d3.select(".files").selectAll("div")
        .data(files).enter().append("div");

    filesContainer.append("dt")
        .html(d => `<code>${d.name}</code> <small>${d.lines.length} lines</small>`);

    filesContainer.append("dd")
        .selectAll("div")
        .data(d => d.lines)
        .enter()
        .append("div")
        .attr("class", "line")
        .style("background", d => fileTypeColors(d.type));
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

function displayStats() {
    // Process commits first
    processCommits();

    // Clear existing stats
    d3.select('.stats').remove();

    let filteredData = data.filter(d => d.datetime <= commitMaxTime);
  
    // Create the dl element
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');

    // Add total commits
    dl.append('dt').text('Commits');
    dl.append('dd').text(filteredCommits.length);

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
            if (d.name === 'global.js'){
                console.log(d.name, 'originalIndex', originalIndex, 'new index', i);
            }
            // console.log(d.name, 'originalIndex', originalIndex, 'new index', i);
            if (originalIndex !== i) {                
                d3.select(this).select('dt')
                    .transition()
                    .duration(100)
                    .style('background-color', 'rgba(50, 165, 251, 0.3)')
                    .style('border-radius', '3px')
                    .style('padding', '2px');

                console.log('highlighted', d.name);
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

                console.log('sorted', d.name, 'to', i);
            });
        }, 300);
    }, sortDelay);
}

// Plot
function createScatterplot(filteredCommits){
    const width = 1000;
    const height = 600;

    d3.select('svg').remove(); // First, clear the existing scatterplot
    displayStats();
    
    const svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    let beforeFirstCommit = new Date(d3.min(filteredCommits, (d) => d.datetime)).getTime() - 48 * 60 * 60 * 1000;
    let afterLastCommit = new Date(d3.max(filteredCommits, (d) => d.datetime)).getTime() + 48 * 60 * 60 * 1000;
    
    xScale = d3
        .scaleTime()
        .domain([new Date(beforeFirstCommit), new Date(afterLastCommit)])
        .range([0, width])
        .nice();
    
    yScale = d3

        .scaleLinear()
        .domain([0, 24])
        .range([height, 0]);

    svg.selectAll('g').remove(); // Clear previous scatter points
    
    const dots = svg.append('g').attr('class', 'dots');

    const sortedCommits = d3.sort(filteredCommits, (d) => -d.totalLines);
    
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

    let dayStep = 1;
    if (totalDays > 10) {
        dayStep = Math.ceil(totalDays / 15); 
    }

    const xAxis = d3.axisBottom(xScale)
        .tickValues(d3.timeDay.range(new Date(beforeFirstCommit), new Date(afterLastCommit), dayStep))
        .tickFormat(d3.timeFormat('%b %d'));
    
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

    const [minLines, maxLines] = d3.extent(sortedCommits, (d) => d.totalLines);
    const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([5, 20]);


    // Add tooltip
    // dots.selectAll('circle').remove(); 
    dots.selectAll('circle')
        .data(sortedCommits)
        .join('circle')
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

    // updateFileList();

    brushSelector();
    brushed({ selection: null });
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
let selectedCommits = [];


function brushed(event) {
    brushSelection = event.selection;
    updateSelection();
    selectedCommits = updateSelectionCount();
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