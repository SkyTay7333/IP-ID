
let userDataFromMongoDB; // Variable to store user data fetched from MongoDB

function getUserData() {
    const userDataString = localStorage.getItem('userData');
    if (userDataString) {
        return JSON.parse(userDataString);
    }
    return {};
}

async function fetchAndUpdateLocalVariable() {
    try {
        const userInfo = await getUserData();

        if (!userInfo || !userInfo._id) {
            window.location.href = 'login.html'; // Corrected redirection
            return;
        }

        const userId = userInfo._id.toString();

        const response = await fetch(`http://localhost:8082/getUserData?userId=${userId}`);

        if (!response.ok) {
            alert(`Error: Server returned status ${response.status}`);
            return;
        }

        // Use clone() to create a clone of the response before reading it
        const responseClone = response.clone();
        const responseBody = await response.text();
        const userData = JSON.parse(responseBody);

        if (userData && userData.user) {
            userDataFromMongoDB = userData.user;
        } else {
            alert('No userData.userData found in the response:', userData);
        }

        // Use the cloned response for subsequent processing
        return responseClone;
    } catch (error) {
        alert('Error fetching and updating local variable:', error);
        return;
    }
}

async function getUserInfo() {
    await fetchAndUpdateLocalVariable();
    return userDataFromMongoDB || {};
}

const leaderboardTable = document.querySelector('#leaderboard-table tbody');

// Function to fetch leaderboard data and update the table
const fetchLeaderboard = async () => {
    try {
        const userInfo = await getUserInfo();
        const userId = userInfo._id;
        const response = await fetch(`http://localhost:8082/getLeaderboard?userId=${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const { leaderboard, currentUserRank } = await response.json();

        // Clear existing rows
        leaderboardTable.innerHTML = '';

        // Display the top 10 players
        const top10Players = leaderboard.slice(0, 10);


        // Update the table with the fetched data
        top10Players.forEach((player, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="py-2 text-center">
                ${index + 1 === currentUserRank ? '👑' : ''} ${index + 1}
                </td>
                <td class="py-2 text-center">${player.username}</td>
                <td class="py-2 text-center">${player.score}</td>
            `;
            const isCurrentUser = player.username === userInfo.username;

            if (isCurrentUser) {
                row.classList.add('bg-yellow-200'); // Example background color
            }
            leaderboardTable.appendChild(row);
        });

        if (currentUserRank > 10) {
            const userRow = document.createElement('tr');
            userRow.innerHTML = `
                <td class="py-2 text-center font-bold">👑 ${currentUserRank}</td>
                <td class="py-2 text-center font-bold">${userInfo.username}</td>
                <td class="py-2 text-center font-bold">${userInfo.return}</td>
            `;
            userRow.classList.add('bg-yellow-200'); // Example background color for the current user
            leaderboardTable.appendChild(userRow);
        }
    } catch (error) {
        console.error('Error fetching leaderboard:', error.message);
    }
};

// Call the fetchLeaderboard function on page load
fetchLeaderboard();