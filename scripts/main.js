const margin = { top: 0, right: 20, bottom: 50, left: 20 };
const width = 1356;
const height = 768;
const avgColor_width = 400;
const avgColor_height = 400;
const tooltip = d3.select(".tooltip");
var brandColors = [];
var avgColor;

//Load data
d3.csv("data/allShades.csv")
  .then(function (data) {
    /* ===  DATA CLEANING  ===  */
    data.forEach((d) => {
      d.lightness = +d.lightness;
      d.sat = +d.sat;
      // delete d.brand
      delete d.hue;
      delete d.sat;
      delete d.colorspace;
      delete d.product;
      delete d.url;
      delete d.description;
      delete d.imgSrc;
      delete d.imgAlt;
      if (d.name === "NA") {
        d.name = d.specific;
      }
      // delete d.name
      delete d.specific;
    });

    // get the brands and sort alphabetically.....PROPERLY
    let brands = Array.from(new Set(data.map((d) => d.brand))).sort((a, b) =>
      a.localeCompare(b)
    );
    // get svg's main container
    let container = d3.select(".main-container");
    // get dominant color svg container
    var avgColor_svg = d3
      .select(".secondary-right")
      .append("svg")
      .attr("width", avgColor_width)
      .attr("height", avgColor_height);
    avgColor_svg
      .append("rect")
      .attr("class", "product")
      .attr("x", "10%")
      .attr("y", "10%")
      //   .attr("transform", "translate(-50%,-50%)")
      .attr("width", avgColor_width - 100)
      .attr("height", avgColor_height - 100)
      .attr("rx", "50")
      .attr("id", "avgColor");

    // set up text to insert later
    avgColor_svg
      .append("text")
      .attr("class", "avgColor-text-brand")
      .attr("x", "47%")
      .attr("y", "5%")
      .attr("dominant-baseline", "middle")
      .attr("text-anchor", "middle");
    avgColor_svg
      .append("text")
      .attr("class", "avgColor-text-color")
      .attr("x", "48%")
      .attr("y", "49%")
      .attr("dominant-baseline", "middle")
      .attr("text-anchor", "middle")
      .attr("fill", "white");

    /* ===  PREPARE FILTER BUTTONS ===  */

    // get dropdown
    // const dropdown = container.append("div").attr("class", "filters").append("select")
    const dropdown = d3.select("#dropdown").on("change", onChange);
    // add sorted brands to the options
    dropdown
      .selectAll("option")
      .data(brands)
      .enter()
      .append("option")
      .text((d) => d);

    // set up the group by lightness button + functionality
    const groupButton = d3
      .select(".filters")
      .append("button")
      .text("Group by Lightness")
      .attr("id", "group-by-lightness-btn")
      .style("display", "none") // hide the button until sort button clicked
      .on("click", function () {
        let brand = d3.select("select").property("value");
        let x = filterByBrand(brand);
        groupByLightness(x);
      });

    // set up the sort by lightness button + functionality
    const sortButton = d3
      .select(".filters")
      .append("button")
      .attr("id", "sort-by-lightness-btn")
      .text("Sort by Lightness")
      .on("click", function () {
        var brand = d3.select("select").property("value");
        let brandData = filterByBrand(brand);
        // sort lightness values
        brandData.sort((a, b) => +a.lightness - +b.lightness);
        // brandData.sort(function(a, b) { return d3.ascending(a.lightness, b.lightness); });
        groupButton.style("display", "inline-block");
        // draw the shades to the screen
        drawRectangles(brandData, brand, true);
      });

    /* ===  ON PAGE LOAD: === */
    // set up the svg
    let svg = container
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    // get range of lightness for scales
    const lightnessExtent = d3.extent(data, (d) => d.lightness);
    // first, initally draw the shades to the screen for the first brand in dropdown
    drawRectangles(filterByBrand("Almay"), "Almay");
    // next, initally set the dominant color
    avgColor = averageColor(brandColors);
    drawAvgColor("Almay");

    /* ===  FUNCTIONS ===  */
    // simiply filter data by brand + remove duplicate products
    function filterByBrand(brand) {
      let x = data.filter(function (d) {
        return d.brand === brand;
      });
      // Filter duplicates
      return filterDuplicates(x);
    }
    // when new brand is selected, redraw rectangles and dominant color
    function onChange() {
      var brand = d3.select("select").property("value");
      let brandData = filterByBrand(brand);
      groupButton.style("display", "none");
      svg.select("#gradient-bar").remove();
      brandColors = [];
      drawRectangles(brandData, brand, false);
      avgColor = averageColor(brandColors);
      drawAvgColor(brand);
    }
    // draw to screen the "average" color
    function drawAvgColor(brand) {
      d3.select("#avgColor").attr("fill", avgColor);
      d3.select(".avgColor-text-color").text(`${avgColor} `);
      d3.select(".avgColor-text-brand").text(
        `dominant color for ${brand}'s shades:`
      );
    }
    function drawRectangles(data, brand, isSorting) {
      // remove gradient bar if group-by-lightness-btn was last pressed
      svg.select("#gradient-bar").remove();

      let x = data;

      // how many products does the brand have?
      const numItems = x.length;
      // calculate number of columns and rows from # of products
      const numColumns = Math.ceil(Math.sqrt(numItems));
      const numRows = Math.ceil(numItems / numColumns);

      // dynamically generate the size of the rectangles based on how many products a brand has
      const rectWidth = width / numColumns;
      const rectHeight = height / numRows;

      let rects = svg.selectAll("rect").data(x, (d) => d.hex);

      // if a brand is selected from the drop down....aka not being sorted
      if (!isSorting) {
        // clear screen
        svg.selectAll("rect").remove();
        // add rectangles
        rects = rects
          .enter()
          .append("rect")
          .attr("class", "product")
          // .attr("id", (d, i) => `rect-${i}`)
          .attr("width", rectWidth)
          .attr("height", rectHeight)
          .merge(rects) // works.......?
          .attr("fill", function (d) {
            brandColors.push(d.hex);
            return d.hex;
          })
          .attr("x", (_, i) => Math.ceil(i % numColumns) * rectWidth)
          .attr("y", (_, i) => Math.floor(i / numColumns) * rectHeight)
          .on("mouseover", function (_, d) {
            // display a toooooooltip!! :)
            tooltip.transition().duration(200).style("opacity", 0.9);
            tooltip.html(
              `<strong>Name:</strong> ${d.name}<br><strong>Hex:</strong> ${d.hex}`
            );
          })
          .on("mouseout", function (d) {
            // hide tooltip :(
            tooltip.transition().duration(500).style("opacity", 0);
          });
      } else {
        // animateeeee the sortingggg!!!
        rects
          .transition()
          .attr("class", "product")
          .duration(1000)
          .ease(d3.easeCubic)
          .attr("width", rectWidth)
          .attr("height", rectHeight)
          .attr("x", (d, i) => (i % numColumns) * rectWidth)
          .attr("y", (d, i) => Math.floor(i / numColumns) * rectHeight);
        //   .select("title")
        //   .text((d) => `${d.name} - ${d.hex}`);
      }
      console.log("brand: ", brandColors);
    }

    // change this to plot by lightness!! maybe?
    // charts the rectangles according to their lightness values on the x-axis (gradient bar)
    function groupByLightness(data) {
      const binWidth = 0.01; // binning together products w/ lightness values within 0.01!
      // how many bins?
      const numBins = Math.ceil(
        (lightnessExtent[1] - lightnessExtent[0]) / binWidth
      );
      // generate an arrayyyy
      const bins = new Array(numBins).fill().map(() => []);

      // place products/rectangles into their respective bins....tricky!
      data.forEach((d) => {
        const binIndex = Math.floor(
          (d.lightness - lightnessExtent[0]) / binWidth
        );
        d.binNum = binIndex;
        bins[binIndex].push(d);
        d.binLoc = bins[binIndex].length - 1;
        // console.log(d, bins[binIndex].length-1);
      });
      svg
        .selectAll("rect")
        .attr("class", (d) => `bin-${d.binNum}-${d.binLoc} product`);

      // set rectangles dimensions
      const rectHeight = 10;
      const rectWidth = 15;

      // set  x scale
      const xScale = d3
        .scaleLinear()
        .domain(lightnessExtent)
        .range([margin.left, width - margin.right]);

      bins.forEach((bin, i) => {
        // each bin get's it own x value according to it's lightness value
        let binX = xScale(lightnessExtent[0] + i * binWidth);
        // set x
        let x = binX;
        //set y so that all bins first product are on the same level
        let binY = height + 200 - rectHeight;
        let y = binY;

        // goo through the bins!!
        bin.forEach((item, j) => {
          // if there is a bin that has 2 or more products, the rectangles need to be stacked on top of each otehr
          if (j >= 1) {
            y -= j / rectHeight + 20;
          }
          // finally, add the rectangles to the page!!
          const selectedRect = d3.selectAll(
            `.bin-${item.binNum}-${item.binLoc}`
          );

          selectedRect
            .transition()
            .duration(1000) // Set transition duration
            .attr("x", x)
            .attr("width", rectWidth)
            .attr("y", y)
            .attr("height", rectHeight);
        });
      });
      // create + add gradient bar
      svg
        .append("rect")
        .attr("id", "gradient-bar")
        .transition()
        .duration(1000)
        .ease(d3.easeCubic)
        .attr("x", margin.left)
        .attr("y", height + 210)
        .attr("width", width - margin.left)
        .attr("height", 35)
        .attr("stroke", "#282828")
        .attr("stroke-width", "2px")
        .attr("fill", function () {
          let gradient = svg
            .append("defs")
            .append("linearGradient")
            .attr("id", "gradient")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "100%")
            .attr("y2", "0%");

          // adding color stops.....initally used quartiles's hex, but selected hexcodes that blended together better
          gradient
            .append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#3A2115");

          gradient
            .append("stop")
            .attr("offset", "30%")
            .attr("stop-color", "#7B492D");

          gradient
            .append("stop")
            .attr("offset", "50%")
            .attr("stop-color", "#BF7949");

          gradient
            .append("stop")
            .attr("offset", "75%")
            .attr("stop-color", "#F3C090");

          gradient
            .append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#FEFEFE");

          // fill
          return "url(#gradient)";
        });
    }
  })
  .catch(function (error) {
    console.error("Error loading the data: ", error);
  });
// essentially, if a hex and lightness already exist in a brand's products, only keep one!
function filterDuplicates(data) {
  const uniqueData = [];
  const seen = new Set();
  data.forEach((d) => {
    const key = d.hex + "-" + d.lightness;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueData.push(d);
    }
  });
  return uniqueData;
}

function averageColor(hexcodes) {
  // initalize red, green, and blau values
  var totalR = 0,
    totalG = 0,
    totalB = 0;
  // iterate through all the colors in hexcodes array and sum up the red, green, + blue values
  for (var i = 0; i < hexcodes.length; i++) {
    var hex = hexcodes[i].replace("#", "");
    totalR += parseInt(hex.substring(0, 2), 16);
    totalG += parseInt(hex.substring(2, 4), 16);
    totalB += parseInt(hex.substring(4, 6), 16);
  }
  // calculate average of each color part
  var numColors = hexcodes.length;
  var avgR = Math.round(totalR / numColors);
  var avgG = Math.round(totalG / numColors);
  var avgB = Math.round(totalB / numColors);

  // call func to get the average
  var avgHex =
    "#" + colorPartToHex(avgR) + colorPartToHex(avgG) + colorPartToHex(avgB);

  return avgHex;
}
// convert hexdacimal part to hex
function colorPartToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}
