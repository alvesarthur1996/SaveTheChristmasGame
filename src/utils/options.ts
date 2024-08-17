export interface SoundOptions {
    BGM: number,
    SFX: number
}

export async function loadOptions() {
    const request = await fetch('http://localhost:8080/load-options', {
        headers: {
            'Content-Type': 'application/json' // Especifica que o corpo da solicitação é JSON
        },
        method: 'GET',
    });

    const response = await request.json();
    return response;
}

export function saveOptions(json: object) {
    console.log(json);
    fetch('http://localhost:8080/save-options', {
        headers: {
            'Content-Type': 'application/json' // Especifica que o corpo da solicitação é JSON
        },
        method: 'POST',
        body: JSON.stringify(json)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            console.log('Success:', data);
        })
        .catch(error => {
            console.error('There was a problem with your fetch operation:', error);
        });
}