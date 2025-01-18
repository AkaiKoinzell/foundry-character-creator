document.addEventListener("DOMContentLoaded", function () {
    const raceSelect = document.getElementById("race");
    const subraceContainer = document.getElementById("subrace-container");
    const subraceSelect = document.getElementById("subrace");
    const classSelect = document.getElementById("class");
    const subclassContainer = document.getElementById("subclass-container");
    const subclassSelect = document.getElementById("subclass");
    const levelSelect = document.getElementById("level");
    const pointsRemaining = document.getElementById("points-remaining");
    const attributes = document.querySelectorAll(".attribute");
    const generateButton = document.getElementById("generate-json");

    let availablePoints = 27;

    function updateSubraces() {
        let selectedRace = raceSelect.value.toLowerCase();
        let racePath = `data/races/${selectedRace}.json`;

        fetch(racePath)
            .then(response => response.json())
            .then(data => {
                if (data.subraces && Object.keys(data.subraces).length > 0) {
                    subraceContainer.style.display = "block";
                    subraceSelect.innerHTML = "";

                    Object.keys(data.subraces).forEach(subrace => {
                        let option = document.createElement("option");
                        option.value = subrace;
                        option.textContent = subrace;
                        subraceSelect.appendChild(option);
                    });
                } else {
                    subraceContainer.style.display = "none";
                }
            })
            .catch(error => console.error("Errore nel caricamento delle sottorazze:", error));
    }

    function updateSubclasses() {
        let selectedClass = classSelect.value.toLowerCase();
        let classPath = `data/classes/${selectedClass}.json`;

        fetch(classPath)
            .then(response => response.json())
            .then(data => {
                if (data.subclasses && Object.keys(data.subclasses).length > 0) {
                    subclassContainer.style.display = "block";
                    subclassSelect.innerHTML = "";

                    Object.keys(data.subclasses).forEach(subclass => {
                        let option = document.createElement("option");
                        option.value = subclass;
                        option.textContent = subclass;
                        subclassSelect.appendChild(option);
                    });
                } else {
                    subclassContainer.style.display = "none";
                }
            })
            .catch(error => console.error("Errore nel caricamento delle sottoclassi:", error));
    }

    function updatePoints() {
        let total = 27;
        attributes.forEach(attr => {
            let value = parseInt(attr.querySelector("span").textContent);
            total -= (value - 8);
        });
        availablePoints = total;
        pointsRemaining.textContent = availablePoints;
    }

    attributes.forEach(attr => {
        let plus = attr.querySelector(".plus");
        let minus = attr.querySelector(".minus");
        let value = attr.querySelector("span");

        plus.addEventListener("click", function () {
            let newValue = parseInt(value.textContent) + 1;
            if (availablePoints > 0 && newValue <= 15) {
                value.textContent = newValue;
                updatePoints();
            }
        });

        minus.addEventListener("click", function () {
            let newValue = parseInt(value.textContent) - 1;
            if (newValue >= 8) {
                value.textContent = newValue;
                updatePoints();
            }
        });
    });

    generateButton.addEventListener("click", function () {
        let characterData = {
            name: document.getElementById("character-name").value,
            race: raceSelect.value,
            subrace: subraceContainer.style.display === "block" ? subraceSelect.value : null,
            class: classSelect.value,
            subclass: subclassContainer.style.display === "block" ? subclassSelect.value : null,
            level: parseInt(levelSelect.value),
            attributes: {}
        };

        attributes.forEach(attr => {
            let attrName = attr.dataset.attribute;
            let attrValue = parseInt(attr.querySelector("span").textContent);
            characterData.attributes[attrName] = attrValue;
        });

        console.log("Generated Character JSON:", characterData);
        alert("Personaggio creato! Controlla la console per i dettagli.");
    });

    raceSelect.addEventListener("change", updateSubraces);
    classSelect.addEventListener("change", updateSubclasses);
    updatePoints();
});
