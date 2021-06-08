import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Viewer, GeoJsonDataSource, Globe, ImageryLayer} from "resium";
import {ArcType, Color, IonImageryProvider} from "cesium";
import './ReactCesiumMap.css';

let selectedCountryCode = null;

function ReactCesiumMap(){

  const [isLoaded, setIsLoaded] = useState(false);
  const [geoCountries, setGeoCountries] = useState(null);
  const [covidCountries, setCovidCountries] = useState([]);
  const [entities, setEntities] = useState([]);

  useEffect(() => {
    
    // https://public.infra.c19-worldnews-backend.com/api/public/ecdc/map_data_v2
    // https://public.infra.c19-worldnews-backend.com/api/public/ecdc/continents
    // https://public.infra.c19-worldnews-backend.com/api/public/ecdc/countries_v2/US

    const requestGeoJson = axios.get("worldmap/countries-110m.geojson");
    const requestCovidData = axios.get("https://public.infra.c19-worldnews-backend.com/api/public/ecdc/map_data_v2");

    axios.all([requestGeoJson, requestCovidData]).then(axios.spread((...responses) => {
        
        const requestGeoJson = responses[0].data;
        const requestCovidData = responses[1].data;

        var new_result = [];
        requestCovidData.forEach(item => {
            new_result[item.name] = {
              deaths: item.deaths,
              cases: item.cases
            };
        });

        setGeoCountries(requestGeoJson);
        setCovidCountries(new_result);
        
        setIsLoaded(true);
        
      })).catch(errors => {
        // react on errors.
      })

    }, []);

    if(!isLoaded){
       return null;
    }else{
      return(
        <Viewer full  baseLayerPicker={false} imageryProvider={false} scene3DOnly={true}
                animation = {false}  timeline ={false} skyAtmosphere={false} orderIndependentTranslucency={false} onMouseMove={onMouseMoveHandler} >
               <ImageryLayer alpha={0.5} imageryProvider={new IonImageryProvider({ assetId: 3812 })} />   
               <Globe
                  showGroundAtmosphere = {false}
                  baseColor = {Color.BLACK.withAlpha(0.5)}
                  undergroundColor = {undefined}
                  colorToAlpha = {0.5}
               />
              <GeoJsonDataSource
                data={geoCountries}
                stroke={Color.BLACK}
                onLoad={g => {
                  for (var i = 0; i < g.entities.values.length; i++) {
                      var entity = g.entities.values[i];
                      entity.polygon.arcType = ArcType.GEODESIC;
                      entity.polygon.height = 300000;
                      entity.polygon.fill = true;
                      var country_code = entity.properties["iso_a2"].getValue();
                      if(covidCountries[country_code]){
                          entity.polygon.material = getColor(covidCountries[country_code].cases);
                          entity.description = [ 
                              '<table class="cesium-infoBox-defaultTable"><tbody>',
                              `<tr><th>County Name</th><td>${entity.properties["name_long"].getValue()}</td></tr>`,
                              `<tr><th>Total Cases</th><td>${covidCountries[country_code].cases}</td></tr>`,
                              `<tr><th>Total Deaths</th><td>${covidCountries[country_code].deaths}</td></tr>`,
                              `<tr><th>Total Recovered</th><td></td></tr>`,
                              '</tbody></table>'
                          ].join('');
                      }else{
                          entity.polygon.material = Color.BLACK;
                          entity.description = [ 
                              '<table class="cesium-infoBox-defaultTable"><tbody>',
                              `<tr><th>Name</th><td>${entity.properties["name_long"].getValue()}</td></tr>`,
                              `<tr><th>Cases</th><td></td></tr>`,
                              `<tr><th>Deaths</th><td></td></tr>`,
                              '</tbody></table>'
                          ].join('');
                      }
                  }
                  setEntities(g.entities.values);
                }}
              />
            </Viewer>
        );
    }
    
    function onMouseMoveHandler(movement, e){
       if(e){
          var country_code = e.properties["iso_a2"].getValue();
          if(selectedCountryCode !== country_code){
             entities.forEach(entity=>{
                if(entity.properties["iso_a2"].getValue() === selectedCountryCode){
                  entity.polygon.height = 300000;
                  if(covidCountries[selectedCountryCode]){
                     entity.polygon.material = getColor(covidCountries[selectedCountryCode].cases);
                  }else{
                    entity.polygon.material = Color.BLACK;
                  }
                }
                if(entity.properties["iso_a2"].getValue() === country_code){
                  entity.polygon.height = 500000;
                  entity.polygon.material = Color.fromCssColorString('#3173b0');
                }
             });
             selectedCountryCode = country_code;
          }
       }else{
           entities.forEach(entity=>{
              if(entity.properties["iso_a2"].getValue() === selectedCountryCode){
                entity.polygon.height = 300000;
                if(covidCountries[selectedCountryCode]){
                    entity.polygon.material = getColor(covidCountries[selectedCountryCode].cases);
                }else{
                  entity.polygon.material = Color.BLACK;
                }
              }
          });
          selectedCountryCode = null;
       }
    }
}

function getColor(d) {
  return  d > 10000000 ? Color.fromCssColorString('#cc3300'):
          d > 5000000 ? Color.fromCssColorString('#cf3d0a'):
          d > 2000000 ? Color.fromCssColorString('#d14714'):
          d > 1000000 ? Color.fromCssColorString('#d4521f'):  
          d > 500000  ? Color.fromCssColorString('#d65c29'):
          d > 200000  ? Color.fromCssColorString('#d96633'):
          d > 100000  ? Color.fromCssColorString('#db703d'):
          d > 50000   ? Color.fromCssColorString('#de7a47'):
          d > 20000   ? Color.fromCssColorString('#e08552'):
          d > 10000   ? Color.fromCssColorString('#e38f5c'):
          d > 5000    ? Color.fromCssColorString('#e69966'):
          d > 2000    ? Color.fromCssColorString('#e8a370'):
          d > 1000    ? Color.fromCssColorString('#ebad7a'):
          d > 500     ? Color.fromCssColorString('#edb885'):
          d > 200     ? Color.fromCssColorString('#f0c28f'):
          d > 100     ? Color.fromCssColorString('#f2cc99'):
          d > 50      ? Color.fromCssColorString('#f5d6a3'):
          d > 20      ? Color.fromCssColorString('#f7e0ad'):
          d > 10      ? Color.fromCssColorString('#faebb8'):
          d > 5       ? Color.fromCssColorString('#fcf5c2'):
          d > 0       ? Color.fromCssColorString('#ffffcc'):
                        Color.GREEN;
                        
}

export default ReactCesiumMap;

