import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { getCoordinates, numberWithCommas, formatDate } from './Utils';
import * as d3 from 'd3';
import Globe from 'react-globe.gl';

import './Covid3DGlobeMap.css';

function Covid3DGlobeMap(){

    const globeElement = useRef();

    const [geoCountries, setGeoCountries] = useState([]);
    const [covidCountries, setCovidCountries] = useState([]);
    const [hoverD, setHoverD] = useState();
    const [globeWidth, setGlobeWidth] = useState(0);
    const [globeHeight, setGlobeHeight] = useState(0);
    const [dates, setDates] = useState([]);
    const [playDiabled, setPlayDisabled] = useState(true);
    const [sliderDisabled, setSliderDisabled] = useState(true);
    const [sliderValue, setSliderValue] = useState(0);
    const [titleDescription, setTitleDescription] = useState('Loading countries affected by the virus...');
    const [totalCases, setTotalCases] = useState(0);
    const [totalDeaths, setTotalDeaths] = useState(0);
    const [totalRecovered, setTotalRecovered] = useState(0);
    const [playLabel, setPlayLabel] = useState("Play");
    const [maxVal, setMaxVal] = useState(null);
    const [colorScaleOption, setColorScaleOption] = useState({key:"Blues", name:"Blues"});
    const [globeKey, setGlobeKey] = useState("earth-blue-marble");
    
    const playAudio = document.getElementById("playAudio");

    const globeOptions = [
        {key: "earth-blue-marble"},
        {key: "earth-night"},
        {key: "earth_atmos"},
        {key: "earth_no_clouds"}
    ];
    
    const scaleColorOptions = [
        {key:"Blues", name:"Blues"},
        {key:"BuGn", name:"Blue-Green"},
        {key:"BuPu", name:"Blue-Purple"},
        {key:"GnBu", name:"Grren-Blue"},
        {key:"Greens", name:"Grrens"},
        {key:"Oranges", name:"Oranges"},
        {key:"OrRd", name:"Orange-Red"},
        {key:"Purples", name:"Purples"},
        {key:"Reds", name:"Reds"},
        {key:"YlOrBr", name:"Yellow-Orange-Brown"},
        {key:"YlOrRd", name:"Yellow-Orange-Red"}
    ];
    const getVal = (feature) => {
       return feature.covidData.cases / feature.properties.POP_EST;
    };
    
    useEffect(() => {
        const globeContainer = document.getElementById("globe-container");

        setGlobeWidth(globeContainer.offsetWidth);
        setGlobeHeight(globeContainer.offsetHeight);

        window.addEventListener('resize', (event) => {
            setGlobeWidth(globeContainer.offsetWidth);
            setGlobeHeight(globeContainer.offsetHeight);
        });

        const requestGeoCountries = axios.get("worldmap/data/countries-110m.geojson");
        const requestGeoTinyCountries = axios.get("worldmap/data/tiny-countries-110m.geojson");

        //const requestCovidData = axios.get("https://raw.githubusercontent.com/wobsoriano/covid3d/master/data.json");
        const requestCovidData = axios.get("worldmap/data/data.json");
        axios.all([requestGeoCountries, requestGeoTinyCountries, requestCovidData]).then(axios.spread(async (...responses) => {
            
            let responseGeoCountries = responses[0].data.features;
            let responseTinyCountries = responses[1].data.features;
            let responseCovidCountries = responses[2].data;
            
            responseTinyCountries.map(d => {
                d.geometry.type = "Polygon";
                d.geometry.coordinates = polygonFromCenter(d.geometry.coordinates);
                return d;
            });

            responseGeoCountries = responseGeoCountries.concat(responseTinyCountries);

            setCovidCountries(responseCovidCountries);

            setTitleDescription('Hover on a country or territory to see cases, deaths, and recoveries.');
            
            const initialDates = Object.keys(responseCovidCountries.China);
            const initialSliderValue = initialDates.length-1;
            
            setDates(initialDates);
            
            setPlayDisabled(false);
            setSliderDisabled(false);
            setSliderValue(initialSliderValue)
            
            let cases = 0;
            let deaths = 0;
            let recovered = 0;
        
            Object.keys(responseCovidCountries).forEach((item) => {
                if (responseCovidCountries[item][initialDates[initialSliderValue]]) {
                    const countryDate = responseCovidCountries[item][initialDates[initialSliderValue]];
                    cases += countryDate.confirmed;
                    deaths += countryDate.deaths;
                    recovered += countryDate.recoveries ? +countryDate.recoveries : 0;
                }
            });
            setTotalCases(cases);
            setTotalDeaths(deaths);
            setTotalRecovered(recovered);
            
            for (let x = 0; x < responseGeoCountries.length; x++) {
                const country_name = responseGeoCountries[x].properties.NAME;
                if (responseCovidCountries[country_name]) {
                    responseGeoCountries[x].covidData = {
                        cases: responseCovidCountries[country_name][initialDates[initialSliderValue]].confirmed,
                        deaths: responseCovidCountries[country_name][initialDates[initialSliderValue]].deaths,
                        recovered: responseCovidCountries[country_name][initialDates[initialSliderValue]].recoveries,
                    };
                } else {
                    responseGeoCountries[x].covidData = {
                        cases: 0,
                        deaths: 0,
                        recovered: 0
                    };
                }
            }
            setGeoCountries(responseGeoCountries);
            setMaxVal(Math.max(...responseGeoCountries.map(getVal)));
            // target to your coordinates
            try {
                const { latitude, longitude } = await getCoordinates();
                globeElement.current.pointOfView({lat: latitude, lng: longitude}, 1000);
            } catch (e) {
                console.log('Unable to set point of view.');
            }

        })).catch(errors => {
            // react on errors.
        })

    }, []);
    
    useEffect(() => {
        if(playLabel === 'Pause'){
            if(sliderValue < dates.length - 1){
                updateCounters();
                updatePolygonsData();   
                const timer = setTimeout(() => {
                   setSliderValue(sliderValue+1);
                }, 300);
                return () => clearTimeout(timer);
            }else{
                playAudio.pause();
                setPlayLabel('Play');
            }
        } 
        updateCounters();
        updatePolygonsData();   
    },[sliderValue]);

    const updateCounters = () => {
        let cases = 0;
        let deaths = 0;
        let recovered = 0;
      
        Object.keys(covidCountries).forEach((item) => {
          if (covidCountries[item][dates[sliderValue]]) {
            const countryDate = covidCountries[item][dates[sliderValue]];
            cases += countryDate.confirmed;
            deaths += countryDate.deaths;
            recovered += countryDate.recoveries ? countryDate.recoveries : 0;
          }
        });

        setTotalCases(cases);
        setTotalDeaths(deaths);
        setTotalRecovered(recovered);
    }
    
    const updatePolygonsData = () => {
        for (let x = 0; x < geoCountries.length; x++) {
            const country_name = geoCountries[x].properties.NAME;
            if (covidCountries[country_name]) {
                geoCountries[x].covidData = {
                    cases: covidCountries[country_name][dates[sliderValue]].confirmed,
                    deaths: covidCountries[country_name][dates[sliderValue]].deaths,
                    recovered: covidCountries[country_name][dates[sliderValue]].recoveries,
                };
            } else {
                geoCountries[x].covidData = {
                    cases: 0,
                    deaths: 0,
                    recovered: 0
                };
            }
        }
        setGeoCountries(geoCountries);
        setMaxVal(Math.max(...geoCountries.map(getVal)));
    }

    const onChangeSlider = (e) => {
       setSliderValue(parseInt(e.target.value));
    }
    
    const onClickPlayHandle = () => {
        if (playLabel === 'Play') {
            playAudio.play();
            setPlayLabel('Pause');
            if (sliderValue === dates.length - 1) {
                setSliderValue(0);
            } else {
                setSliderValue(sliderValue+1);
            }
        }else{
            playAudio.pause();
            setPlayLabel('Play');
        }
    }
    
    const onClickColorScaleHandle = (e) =>{
       e.preventDefault();
       setColorScaleOption({
           key: e.target.name,
           name: e.target.title
       });
    }

    const onClickGlobeImageHandle = (e) => {
        e.preventDefault();
        setGlobeKey(e.target.name);
    }

    return (
        <div id="globe-container">
            <Globe
                ref={globeElement}
                width={globeWidth}
                height={globeHeight}
                globeImageUrl={`worldmap/globe-images/${globeKey}.jpg`}
                backgroundImageUrl="worldmap/globe-images/night-sky.png"
                backgroundColor="#000"
                polygonsData={geoCountries}
                polygonAltitude={d => d === hoverD ? 0.1 : 0.06}
                polygonCapColor={d =>{
                    if(d === hoverD){
                        return 'cyan';
                    }else{
                        let colorScale;
                        switch(colorScaleOption.key){
                            case "Blues":
                                colorScale = d3.scaleSequentialPow(d3.interpolateBlues).exponent(1 / 4);
                                break;
                            case "BuGn":
                                colorScale = d3.scaleSequentialPow(d3.interpolateBuGn).exponent(1 / 4);
                                break;
                            case "BuPu":
                                colorScale = d3.scaleSequentialPow(d3.interpolateBuPu).exponent(1 / 4);
                                break;    
                            case "GnBu":
                                colorScale = d3.scaleSequentialPow(d3.interpolateGnBu).exponent(1 / 4);
                                break;
                            case "Greens":
                                colorScale = d3.scaleSequentialPow(d3.interpolateGreens).exponent(1 / 4);
                                break;
                            case "Oranges":
                                colorScale = d3.scaleSequentialPow(d3.interpolateOranges).exponent(1 / 4);
                                break;
                            case "OrRd":
                                colorScale = d3.scaleSequentialPow(d3.interpolateOrRd).exponent(1 / 4);
                                break;
                            case "Purples":
                                colorScale = d3.scaleSequentialPow(d3.interpolatePurples).exponent(1 / 4);
                                break;
                            case "Reds":
                                colorScale = d3.scaleSequentialPow(d3.interpolateReds).exponent(1 / 4);
                                break;
                            case "YlOrBr":
                                colorScale = d3.scaleSequentialPow(d3.interpolateYlOrBr).exponent(1 / 4);
                                break;
                            case "YlOrRd":
                                colorScale = d3.scaleSequentialPow(d3.interpolateYlOrRd).exponent(1 / 4);
                                break;
                            default:
                                colorScale = d3.scaleSequentialPow(d3.interpolateBlues).exponent(1 / 4);
                        }
                        colorScale.domain([0, maxVal]);
                        return colorScale(getVal(d))
                    }
                }}
                polygonSideColor={() => 'rgba(0, 100, 0, 0.15)'}
                polygonStrokeColor={() => '#111'}
                polygonLabel={({ properties: d, covidData: c }) =>{
                    var flagName = d.ISO_A2.toLowerCase();
                    return [
                        `<div class="card">`,
                            `<img class="card-img" src="worldmap/country-flags/svg/${flagName}.svg" alt="flag" />`,
                            `<div class="container">`,
                                `<span class="card-title"><b>${d.NAME} [${d.ISO_A2}]</b></span> <br />`,
                                `<div class="card-spacer"></div>`,
                                `<hr />`,
                                `<div class="card-spacer"></div>`,
                                `<span>Cases: ${numberWithCommas(c.cases)}</span>  <br />`,
                                `<span>Deaths: ${numberWithCommas(c.deaths)}</span> <br />`,
                                `<span>Recovered: ${numberWithCommas(c.recovered)}</span> <br />`,
                                `<span>Population: ${d3.format('.3s')(d.POP_EST)}</span>`,
                            `</div>`,
                        `</div>`
                    ].join('');
                    
                }}
                onPolygonHover={setHoverD}
                polygonsTransitionDuration={300}
            />
            <div className="top-info-container">
                <div className="title">COVID-19</div>
                <div className="title-desc">{titleDescription}</div>
            </div>
            <div className="button-controls">
                <div id="dropdown-color-scales" className="dropdown">
                    <button className="dropdown-button" style={{backgroundImage:`url(worldmap/color-scales/${colorScaleOption.key}.png)`}}>{colorScaleOption.name}</button>
                    <div className="dropdown-content">
                        {scaleColorOptions.map(item => (
                            <a href="#" key={item.key} name={item.key} title={item.name} onClick={onClickColorScaleHandle} style={{backgroundImage:`url(worldmap/color-scales/${item.key}.png)`}}>{item.name}</a>
                        ))}
                    </div>
                </div>
                <div className="dropdown" id="dropdown-globes">
                    <button className="dropdown-button" style={{backgroundImage:`url(worldmap/globe-icons/${globeKey}.png)`}}></button>
                    <div className="dropdown-content">
                        {globeOptions.map(item => (
                            <a href="#" key={item.key} name={item.key} onClick={onClickGlobeImageHandle} style={{backgroundImage:`url(worldmap/globe-icons/${item.key}.png)`}}></a>
                        ))}
                    </div>
                </div>
            </div>
            <div className="side-info-container">
                <table>
                    <tbody>
                        <tr><td><span className="updated">{formatDate(dates[sliderValue])}</span></td></tr>
                        <tr><td>Total CASES</td><td><span id="infected">{numberWithCommas(totalCases)}</span></td></tr>
                        <tr><td>Total Deaths</td><td><span id="deaths">{numberWithCommas(totalDeaths)}</span></td></tr>
                        <tr><td>Total Recovered</td><td><span id="recovered">{numberWithCommas(totalRecovered)}</span></td></tr>
                    </tbody>
                </table>
            </div>
            <div className="bottom-info-container">
                <div style={{display:'flex', justifyContent:'center'}}>
                    <div className="timeline-container">
                        <button className="play-button" disabled={playDiabled} style={{marginRight:'10px'}} onClick={onClickPlayHandle} >{playLabel}</button>
                        <input className="slider"  disabled={sliderDisabled} type="range"  min="0"  max={dates.length-1}  step="1" value={sliderValue} onChange={onChangeSlider} />
                        <span className="slider-date" style={{fontSize:'14px',color:'#ccd6f6'}}>
                            {dates[sliderValue]}
                        </span>
                    </div>
                </div>
                <div style={{fontSize:'14px',color:'#ccd6f6',marginTop:'35px'}}>
                     Total Counts <span className="updated">{`(as of ${formatDate(dates[sliderValue])})`}</span>
                </div>
                <div style={{color:'#e6f1ff', padding:'0 5px'}}>
                      CASES: <span id="infected">{numberWithCommas(totalCases)}</span> • DEATHS: <span id="deaths">{numberWithCommas(totalDeaths)}</span> • RECOVERED: <span id="recovered">{numberWithCommas(totalRecovered)}</span>
                </div>
            </div>
        </div>
    );
}

function polygonFromCenter(center, radius=0.5, num=10) {
    let coords = [];
    for (let i = 0; i < num; i++) {
      const dx = radius*Math.cos(2*Math.PI*i/num);
      const dy = radius*Math.sin(2*Math.PI*i/num);
      coords.push([center[0] + dx, center[1] + dy]);
    }
    return [coords];
  }

export default Covid3DGlobeMap;