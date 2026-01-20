fetch("https://jeeplinkapi.vercel.app/")
  .then(response => response.json())
  .then(data => {
    document.getElementById("textHere").textContent = data.Hello;
  })
  .catch(error => {
    console.error(error);
    document.getElementById("textHere").textContent = "Error loading data";
  });