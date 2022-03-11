let map;
let directionsService;
let directionsRenderer;
let highways; 
let tolls; 
let origin;

async function initMap() {
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 6,
        center: { lat: 41.85, lng: -87.65 },
    });
    getcurrent(map);
    directionsRenderer.setMap(map);
    document.getElementById("submit").addEventListener("click", () => {
        highways = document.getElementById("Highways").checked;
        tolls = document.getElementById("Tolls").checked;
        getPath(directionsService, directionsRenderer)
    });
}

async function getPath(directionsService, directionsRenderer) {
    var route;
    var routeDistance;
    var infoWindow = new google.maps.InfoWindow();
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                origin = pos;
                
                if(document.getElementById("start").value != "") {
                    origin = document.getElementById("start").value;
                }
                var sd = document.getElementById("segDistance").value;
                var segmentDistance = getMeters(sd);
                var reached = false;
                console.log(origin)
                await directionsService
                    .route({
                        origin: origin,
                        destination: document.getElementById("end").value,
                        optimizeWaypoints: true,
                        travelMode: google.maps.TravelMode.DRIVING,
                        unitSystem: google.maps.UnitSystem.IMPERIAL,
                        avoidHighways: highways,
                        avoidTolls: tolls,
                    })
                    .then((response) => {
                        console.log(response.routes[0])
                        route = response.routes[0].overview_path
                        routeDistance = response.routes[0].legs[0].distance.value;
                        if(segmentDistance > routeDistance) {
                            console.log("distance to long");
                            directionsRenderer.setDirections(response);
                            reached = true;
                        }
                    })
                    .catch((e) => window.alert("Directions request failed due to " + status));

                if(!reached) {
                    var distance = 0;
                    var closest;
                    var start = Math.round(route.length / (routeDistance / segmentDistance));
                    var stop = false;
                    for(let i = start; i < route.length; i++) {
                        if(stop) {
                            break;
                        }

                        if(i % 9 == 0) {
                            await new Promise(r => setTimeout(r, 10000));
                        }
                        
                        await directionsService
                            .route({
                                origin: origin,
                                destination: { lat: route[i].toJSON().lat, lng: route[i].toJSON().lng },
                                optimizeWaypoints: true,
                                travelMode: google.maps.TravelMode.DRIVING,
                                unitSystem: google.maps.UnitSystem.IMPERIAL,
                                avoidHighways: highways,
                                avoidTolls: tolls,
                            })
                            .then((response) => {
                                distance = response.routes[0].legs[0].distance.value;
                                if(response.routes[0].legs[0].distance.value >= segmentDistance) {
                                    closest = { lat: route[i-1].toJSON().lat, lng: route[i-1].toJSON().lng };
                                    // console.log(distance, i);
                                    stop = true;
                                } else {
                                    // console.log(distance, i);
                                };
                            })
                            .catch((e) => window.alert("Directions request failed due to " + status));
                    }
                    // console.log(closest);
                    await getNearbyPlaces(map, closest);
                }
            }
        )
    } else {
        // Browser doesn't support Geolocation
        handleLocationError(false, infoWindow, map.getCenter());
    } 
}

// Get Current Location Function
function getcurrent(map){
    infoWindow = new google.maps.InfoWindow();

    const locationButton = document.createElement("img");

    locationButton.type = "image";
    locationButton.style.cursor = "pointer";
    locationButton.src = "./src/locate.png";
    locationButton.width = "40";
    locationButton.style.marginRight = "10px";
    locationButton.style.boxShadow = "0px 0px 5px #636060";
    document.body.appendChild(locationButton);

    locationButton.classList.add("custom-map-control-button");
    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(locationButton);
    locationButton.addEventListener("click", () => {
    
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
        
          var marker = new google.maps.Marker({
            position: pos,
            map: map,
            icon: "./src/location.png",
          }); 
          marker.setMap(map);

          map.setCenter(pos);
          return pos;
          },
          () => {
          handleLocationError(true, infoWindow, map.getCenter());
          }
        );
      } else {
      // Browser doesn't support Geolocation
        handleLocationError(false, infoWindow, map.getCenter());
      }
    });
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
    infoWindow.setPosition(pos);
    infoWindow.setContent(
      browserHasGeolocation
        ? "Error: The Geolocation service failed."
        : "Error: Your browser doesn't support geolocation."
    );
    infoWindow.open(map);
}

function getMeters(i) {
    return i*1609.344;
}

// Search for Nearby Charging Station from point on path
async function getNearbyPlaces(map, position) {
    // console.log(position)
    let request = {
        location: position,
        rankBy: google.maps.places.RankBy.DISTANCE,
        keyword: 'Electric vehicle charging'
    };

    service = new google.maps.places.PlacesService(map);
    await service.nearbySearch(request, nearbyCallback);
}

// Handle the results (up to 20) of the Nearby Search
function nearbyCallback(results, status) {
    if (status == google.maps.places.PlacesServiceStatus.OK) {
        // console.log(results);
        directionsService
            .route({
                origin: origin,
                destination: results[0].geometry.location,
                optimizeWaypoints: true,
                travelMode: google.maps.TravelMode.DRIVING,
                unitSystem: google.maps.UnitSystem.IMPERIAL,
                avoidHighways: highways,
                avoidTolls: tolls,
            })
            .then((response) => {
                directionsRenderer.setDirections(response);
            })
            .catch((e) => window.alert("Directions request failed due to " + status));
        
    }
    
}