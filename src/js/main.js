import mainHTML from './text/main.html!text'
import share from './lib/share'
import * as d3 from "d3"
import * as topojson from "topojson"

var shareFn = share('Interactive title', 'http://gu.com/p/URL', '#Interactive');


export function init(el, context, config, mediator) {
    
    var isAndroidApp = (window.location.origin === "file://" && /(android)/i.test(navigator.userAgent) ) ? true : false;    
    el.innerHTML = mainHTML.replace(/%assetPath%/g, config.assetPath);    


    // if (isAndroidApp) {
    //     d3.select("#variableNote").text("Census data")
    // }
    var currentSelection = "average_household_size";

    function numberFormat(num) {
        if ( num > 0 ) {
            if ( num > 1000000000 ) { return ( num / 1000000000 ).toFixed(1) + 'bn' }
            if ( num > 1000000 ) { return ( num / 1000000 ).toFixed(1) + 'm' }
            if (num % 1 != 0) { return num.toFixed(2) }
            else { return num.toLocaleString() }
        }
        if ( num < 0 ) {
            var posNum = num * -1;
            if ( posNum > 1000000000 ) return [ "-" + String(( posNum / 1000000000 ).toFixed(1)) + 'bn'];
            if ( posNum > 1000000 ) return ["-" + String(( posNum / 1000000 ).toFixed(1)) + 'm'];
            else { return num.toLocaleString() }
        }
        return num;
    }


    function makeMap(sa2s,places) {

    // console.log(sa2s,places) 

    var statusMessage = d3.select("#statusMessage");

    var width = document.querySelector("#mapContainer").getBoundingClientRect().width
    var height = width * 0.6
    if (width < 500) {
        height = width * 0.8;
    }
    var margin = {top: 0, right: 0, bottom: 0, left:0}
    var active = d3.select(null);
    var scaleFactor = 1;
    var projection = d3.geoMercator()
                    .center([135,-28.0])
                    .scale(width*0.85)
                    .translate([width/2,height/2])

    var path = d3.geoPath()
        .projection(projection);

    var graticule = d3.geoGraticule();  

    // console.log(sa2s.objects.sa2s)

    var zoom = d3.zoom()
            .scaleExtent([1, 100])
            .on("zoom", zoomed);    

    d3.select("#mapContainer svg").remove();
            
    var svg = d3.select("#mapContainer").append("svg")
                    .attr("width", width)
                    .attr("height", height)
                    .attr("id", "map")
                    .attr("overflow", "hidden")
                    .on("mousemove", tooltipMove)
                    .call(zoom)
                    .on('onTouchStart', function(currentSwiper, e) {
                        if (isAndroidApp && window.GuardianJSInterface.registerRelatedCardsTouch) {
                            window.GuardianJSInterface.registerRelatedCardsTouch(true);
                        }
                    })
                    .on('onTouchEnd', function(currentSwiper, e) {
                        if (isAndroidApp && window.GuardianJSInterface.registerRelatedCardsTouch) {
                            window.GuardianJSInterface.registerRelatedCardsTouch(false);
                        }
                    });

    var tooltip = d3.select("#mapContainer")
        .append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("z-index", "20")
        .style("visibility", "hidden")
        .style("top", "30px")
        .style("left", "55px");                 

    var features = svg.append("g")

    features.append("path")
                .datum(graticule)
                .attr("class", "graticule")
                .attr("d", path);                       

    features.append("g")
        .selectAll("path")
        .data(topojson.feature(sa2s,sa2s.objects.sa2s).features)
        .enter().append("path")
            .attr("class", "sa2")
            .attr("id", d => "sa2" + d.properties.SA2_MAIN16)
            .attr("fill", "#dcdcdc")
            // .attr("stroke", "#647882")
            .attr("data-tooltip","test")
            .attr("d", path)
            .on("mouseover", tooltipIn)
            .on("mouseout", tooltipOut) 

    if (width > 480) {
        features.append("path")
          .attr("class", "mesh")
          .attr("stroke-width", 0.5)
          .attr("d", path(topojson.mesh(sa2s, sa2s.objects.sa2s, function(a, b) { return a !== b; }))); 
    }
          

    var scalePurple = d3.scaleLinear()
        .range(['rgb(242,240,247)','rgb(84,39,143)'])       

    var keyColors = ['#4575b4','#74add1','#abd9e9','#e0f3f8','#ffffbf','#fee090','#fdae61','#f46d43','#d73027']  

    var thresholds = [-1000,-100,-10,-1,0,1,10,100,1000]
    
    var color = d3.scaleThreshold()
        .domain(thresholds)
        .range(keyColors)


    var keyWidth = 250;    

    d3.select("#keyContainer svg").remove();

    var keySvg = d3.select("#keyContainer")
                    .append("svg")
                    .attr("width", keyWidth)
                    .attr("height", "40px")
                    .attr("id", "keySvg")
            
    var keySquare = keyWidth/10;                

    keyColors.forEach(function(d,i) {
        keySvg.append("rect")
            .attr("x",keySquare*i)
            .attr("y", 0)
            .attr("width", keySquare)
            .attr("height",15)
            .attr("fill",d)
            .attr("stroke", "#dcdcdc")
    })

    var leftLabel = keySvg.append("text")
            .attr("x",0)
            .attr("y",30)
            .attr("text-anchor","start")
            .attr("id", "leftKeyLabel")
            .attr("class","keyLabel")
            .text("0")

    var rightLabel = keySvg.append("text")
            .attr("x",keyWidth)
            .attr("y",30)
            .attr("text-anchor","end")
            .attr("id", "rightKeyLabel")
            .attr("class","keyLabel")
            .text("100")    

    function updateMap(id) {
        // console.log(`${config.assetPath}/assets/data/${id}.json`)
        statusMessage.style("opacity",1);
        d3.json(`${config.assetPath}/assets/data/${id}.json`, function(error,newData) {
            
            if (error) {
                console.log(error)
            }; 

            statusMessage.transition(600).style("opacity",0);

            var dataArray = d3.entries(newData).map(function(d) { return(d.value)})
            // color.domain(d3.extent(dataArray))
            // console.log(color.quantiles())
            // console.log(d3.extent(dataArray))

            leftLabel.text(numberFormat(d3.extent(dataArray)[0]))
            rightLabel.text(numberFormat(d3.extent(dataArray)[1]))

            d3.selectAll(".sa2")
                .transition("changeFill")
                    .attr("fill", function(d) {
                        if (typeof(newData[d.properties.SA2_MAIN16]) != 'undefined') {
                            return color(newData[d.properties.SA2_MAIN16])  
                        }
                        else {
                            return "#dcdcdc"
                        }
                    })

           d3.selectAll(".sa2")         
                    .attr("data-tooltip", function(d) {
                        if (typeof(newData[d.properties.SA2_MAIN16]) != 'undefined') {
                            return `${statLookup[id]}: ${numberFormat(newData[d.properties.SA2_MAIN16])}`
                        }

                        else {
                            return "Unavailable"    
                        }
                        
                    })


        })
        
    }       

    function tooltipMove(d) {
        var leftOffset = 0
        var rightOffset = 0
        var mouseX = d3.mouse(this)[0]
        var mouseY = d3.mouse(this)[1]
        var half = width/2;
        if (mouseX < half) {
            d3.select(".tooltip").style("left", d3.mouse(this)[0] + "px");
        }

        else if (mouseX >= half) {
            d3.select(".tooltip").style("left", ( d3.mouse(this)[0] -200) + "px");
        }
        
        d3.select(".tooltip").style("top", (d3.mouse(this)[1] + 30 ) + "px");
    }       

    function tooltipIn(d) {     
        var tooltipText = d3.select(this).attr('data-tooltip')
        d3.select(".tooltip").html(`<b>${d.properties.SA2_NAME16}</b><br>${tooltipText}`).style("visibility", "visible");
        
    }

    function tooltipOut(d) {
        d3.select(".tooltip").style("visibility", "hidden");
    }           
    

    d3.select("#zoomIn").on("click", function(d) {
        zoom.scaleBy(svg.transition().duration(750), 1.5);
    });    

    d3.select("#zoomOut").on("click", function(d) {
        zoom.scaleBy(svg.transition().duration(750), 1/1.5);
    }); 


    function zoomed() {
        
        scaleFactor = d3.event.transform.k;
        d3.selectAll(".mesh").style("stroke-width", 0.5 / d3.event.transform.k + "px");
        features.style("stroke-width", 0.5 / d3.event.transform.k + "px");
        features.attr("transform", d3.event.transform); // updated for d3 v4

        features.selectAll(".placeContainers")
            .style("display", function(d) { 
                if (d['properties']['scalerank'] < d3.event.transform.k) {
                    return "block";
                }
                else {
                    return "none";
                }
                })

        features.selectAll(".placeText")
                .style("font-size", 0.8/d3.event.transform.k + "rem")
                .attr("dx", 5/d3.event.transform.k )
                .attr("dy", 5/d3.event.transform.k );               

    }

    function reset() {
        active.classed("active", false);
        active = d3.select(null);
        svg.transition()
            .duration(750)
            .call( zoom.transform, d3.zoomIdentity );
    }

    d3.select("#statChooser").on("change", function() {
        currentSelection = d3.select(this).property('value');
        updateMap(d3.select(this).property('value'));
    })

    updateMap(currentSelection);

    }


    [].slice.apply(el.querySelectorAll('.interactive-share')).forEach(shareEl => {
        var network = shareEl.getAttribute('data-network');
        shareEl.addEventListener('click',() => shareFn(network));
    });

   var statLookup = {
  "average_household_size": "Average household size",
  "born_overseas": "Persons born overseas",
  "percent_born_overseas": "Percent born overseas (%)",
  "defacto_females": "Females in a defacto relationship",
  "defacto_males": "Males in a defacto relationship",
  "dwelling_owned_mortgage": "Dwellings owned with a mortgage",
  "dwelling_owned_mortgage_percent": "Dwellings owned with a mortgage (%)",
  "dwelling_owned_outright": "Dwellings owned outright",
  "dwelling_owned_outright_percent": "Dwellings owned outright (%)",
  "dwelling_rented": "Rented",
  "dwelling_rented_percent": "Dwellings rented (%)",
  "female": "Females",
  "flat_or_unit": "Flat or unit",
  "flat_or_unit_percent": "Flat or unit (%)",
  "indig_persons": "Indigenous persons",
  "language_other": "Language at home besides English",
  "percent_language_other": "Language at home besides English (%)",
  "male": "Males",
  "married_females": "Married females",
  "married_males": "Married males",
  "median_age": "Median age",
  "median_household_income": "Median household income",
  "median_mortgage": "Median mortgage",
  "median_rent": "Median rent",
  "non_indig_persons": "Non-Indigenous persons",
  "notmarried_females": "Unmarried females",
  "notmarried_males": "Unmarried males",
  "percent_defacto_females": "Females in a defacto relationship (%)",
  "percent_defacto_males": "Males in a defacto relationship (%)",
  "percent_female": "Female (%)",
  "percent_indig_persons": "Indigenous persons (%)",
  "percent_male": "Male (%)",
  "percent_married_females": "Married females (%)",
  "percent_married_males": "Married males (%)",
  "percent_notmarried_females": "Unmarried females (%)",
  "percent_notmarried_males": "Unmarried males (%)",
  "persons": "Persons",
  "persons_per_bedroom": "Average number of persons per bedroom",
  "semi_or_townhouse": "Semi-detached or townhouse",
  "semi_or_townhouse_percent": "Semi-detached or townhouse (%)",
  "seperate_house": "Freestanding house",
  "religious_persons_percent":"% religious",
  "non_religious_persons_percent":"% non-religious",
  "non_religious_persons":"Non-religions persons",
  "religious_persons":"Religious persons"
}

    var stats = [{"stat_key":"average_household_size","short_description":"Average household size"},
{"stat_key":"born_overseas","short_description":"Persons born overseas"},
{"stat_key":"percent_born_overseas","short_description":"Percent born overseas (%)"},
{"stat_key":"defacto_females","short_description":"Females in a defacto relationship"},
{"stat_key":"defacto_males","short_description":"Males in a defacto relationship"},
{"stat_key":"dwelling_owned_mortgage","short_description":"Dwellings owned with a mortgage"},
{"stat_key":"dwelling_owned_mortgage_percent","short_description":"Dwellings owned with a mortgage (%)"},
{"stat_key":"dwelling_owned_outright","short_description":"Dwellings owned outright"},
{"stat_key":"dwelling_owned_outright_percent","short_description":"Dwellings owned outright (%)"},
{"stat_key":"dwelling_rented","short_description":"Rented"},
{"stat_key":"dwelling_rented_percent","short_description":"Dwellings rented (%)"},
{"stat_key":"female","short_description":"Females"},
{"stat_key":"flat_or_unit","short_description":"Flat or unit"},
{"stat_key":"flat_or_unit_percent","short_description":"Flat or unit (%)"},
{"stat_key":"indig_persons","short_description":"Indigenous persons"},
{"stat_key":"language_other","short_description":"Language at home besides English"},
{"stat_key":"percent_language_other","short_description":"Language at home besides English (%)"},
{"stat_key":"male","short_description":"Males"},
{"stat_key":"married_females","short_description":"Married females"},
{"stat_key":"married_males","short_description":"Married males"},
{"stat_key":"median_age","short_description":"Median age"},
{"stat_key":"median_household_income","short_description":"Median weekly household income ($)"},
{"stat_key":"median_mortgage","short_description":"Median monthly mortgage payment ($)"},
{"stat_key":"median_rent","short_description":"Median weekly rent ($)"},
{"stat_key":"non_indig_persons","short_description":"Non-Indigenous persons"},
{"stat_key":"notmarried_females","short_description":"Unmarried females"},
{"stat_key":"notmarried_males","short_description":"Unmarried males"},
{"stat_key":"percent_defacto_females","short_description":"Females in a defacto relationship (%)"},
{"stat_key":"percent_defacto_males","short_description":"Males in a defacto relationship (%)"},
{"stat_key":"percent_female","short_description":"Female (%)"},
{"stat_key":"percent_indig_persons","short_description":"Indigenous persons (%)"},
{"stat_key":"percent_male","short_description":"Male (%)"},
{"stat_key":"percent_married_females","short_description":"Married females (%)"},
{"stat_key":"percent_married_males","short_description":"Married males (%)"},
{"stat_key":"percent_notmarried_females","short_description":"Unmarried females (%)"},
{"stat_key":"percent_notmarried_males","short_description":"Unmarried males (%)"},
{"stat_key":"persons","short_description":"Persons"},
{"stat_key":"religious_persons_percent","short_description":"% religious"},
{"stat_key":"non_religious_persons_percent","short_description":"% non-religious"},
{"stat_key":"non_religious_persons","short_description":"Non-religions persons"},
{"stat_key":"religious_persons","short_description":"Religious persons"},
{"stat_key":"persons_per_bedroom","short_description":"Average number of persons per bedroom"},
{"stat_key":"semi_or_townhouse","short_description":"Semi-detached or townhouse"},
{"stat_key":"semi_or_townhouse_percent","short_description":"Semi-detached or townhouse (%)"},
{"stat_key":"seperate_house","short_description":"Freestanding house"}]


    stats.forEach(function(d) {
        d3.select("#statChooser")
            .append("option")
            .attr("value", d.stat_key)
            .text(d.short_description)
    })


    var q = d3.queue()
        .defer(d3.json, `${config.assetPath}/assets/data/sa22.json`)
        .defer(d3.json, `${config.assetPath}/assets/data/places.json`)
        .awaitAll(function(error, results) {
            if (error) throw error;
            makeMap(results[0],results[1])
            var to=null
             var lastWidth = document.querySelector(".interactive-container").getBoundingClientRect()
             window.addEventListener('resize', () => {
              var thisWidth = document.querySelector(".interactive-container").getBoundingClientRect()
              if (lastWidth != thisWidth) {
                window.clearTimeout(to);
                to = window.setTimeout(function() {
                    makeMap(results[0],results[1])
                }, 500)
              }
            })
        });


    
}
