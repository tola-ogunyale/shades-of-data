const map_width = 400;
const map_height = 400;
//colors for map
const color_default = "#d1c1b0";
const color_background = "#e3dad0";
const color_selected = "#b0c0d1";

// initalize svg
let svg = d3
  .select(".secondary-left")
  .append("svg")
  .attr("width", map_width)
  .attr("height", map_height);

// define projection
let projection = d3
  .geoOrthographic()
  .scale(150)
  .translate([map_width / 2, map_height / 2])
  .precision(0.1)
  .rotate([0, 0]);

// generate path
let path = d3.geoPath().projection(projection);

/* == geeksforgeeks d3.orthographic rotation function + config == */
const config = {
  speed: 0.025,
  verticalTilted: -10,
  horizontalTilted: 0,
};
function Rotate() {
  d3.timer(function (elapsed) {
    projection.rotate([
      config.speed * elapsed - 120,
      config.verticalTilted,
      config.horizontalTilted,
    ]);
    svg.selectAll("path").attr("d", path);
  });
}
/* == * == */

// load
d3.json("data/maps/world-110m.json").then(function (world) {
  // initalize topojson file
  let geography = topojson.feature(world, world.objects.countries).features;
  // console.log(geography);
  // console.log(features);

  // create sphere to outline globe
  svg
    .append("path")
    .datum({ type: "Sphere" })
    .attr("class", "sphere-outline")
    .attr("d", path);

  // land masses + countries
  svg
    .selectAll(".country")
    .data(geography)
    .enter()
    .insert("path")
    .attr("class", "geography")
    .attr("id", (d) => d.properties.name.replace(/\s+/g, "-"))
    .attr("d", path)
    .style("fill", color_default);
  svg
    .insert("path")
    .datum(
      topojson.mesh(world, world.objects.countries, function (a, b) {
        return a !== b;
      })
    )
    .attr("class", "boundary")
    .attr("d", path);

  // caption text
  let caption = svg
    .append("text")
    .attr("x", "47%")
    .attr("y", "5%")
    .attr("dominant-baseline", "middle")
    .attr("text-anchor", "middle");

  d3.json("data/AllCountries.json").then(function (data) {
    // let brands = data.map((d) => d.brand);
    // let origins = data.map((d) => d.origin);
    let selectedBrand;
    let origin_geo;

    /* ON LOAD: DEFAULTS */
    let default_brand = "Almay";
    let default_country = "United States of America";
    Rotate();

    d3.selectAll(".geography")
      .transition()
      .delay(1000)
      .duration(1000)
      .style("fill", color_background);

    d3.select(`#${default_country.replace(/\s+/g, "-")}`)
      .transition()
      .delay(1500)
      .duration(1000)
      .style("fill", color_selected);

    setText(default_country);

    dropdown.addEventListener("change", function () {
      // reset map colors when new brand selected
      d3.selectAll(".geography")
        .transition()
        .duration(900)
        .style("fill", color_default);

      // get brand from drop down
      selectedBrand = dropdown.value;
      // find the brand in the json data
      let brandData = data.find((d) => d.brand === selectedBrand);
      // if brand found
      if (brandData) {
        // get its origin
        let origin = brandData.origin;
        // set caption text to origin's name
        setText(origin);
        // fade out all countries
        d3.selectAll(".geography")
          .transition()
          .delay(1000)
          .duration(1000)
          .style("fill", color_background);
        console.log(brandData, origin, origin_geo);

        //highlight selected country
        origin_geo = d3
          .select(`#${origin.replace(/\s+/g, "-")}`)
          .transition()
          .delay(1500)
          .duration(1000)
          .style("fill", color_selected);
      }
    });
    // sets the text of the caption
    function setText(origin) {
      caption
        .text(`country of origin: `)
        .append("tspan")
        .attr("fill", "#9eadbc")
        .text(`${origin}`);
    }
  });
});
