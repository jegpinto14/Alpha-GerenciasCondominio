fetch('https://ve.dolarapi.com/v1/dolares/oficial')
    .then(response => response.json())
    .then(data => {
        console.log(data)
        const tasaDolarBcv = document.getElementById("tasaValue");
        tasaDolarBcv.textContent = data.promedio;
    })
    .catch(error => console.error(error))