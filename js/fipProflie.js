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

// Function to calculate and display financial information
async function displayFinancialInformation(userData) {
    // Get the required DOM elements
    const allInvestmentElement = document.getElementById('total-equity');
    const equityElement = document.getElementById('equity');
    const cashElement = document.getElementById('cash');
    const totalUnrealisedReturn = document.getElementById('total-UnReturn');
    const totalReturnElement = document.getElementById('total-return');


    // Calculate total equity, equity, and total unrealized return
    const equity = await calculateTotalEquity(userData);
    const allInvestment = await calculatetotalInvestment(userData);
    const cash = totalCash(userData);
    const unrealizedReturn = await calculateTotalUnrealizedReturn(userData);
    const totalReturn = TotalReturn(userData);


    // Display the calculated values in the DOM with rounding
    allInvestmentElement.textContent = formatNumber(allInvestment);
    equityElement.textContent = formatNumber(equity);
    cashElement.textContent = formatNumber(cash);

    // Display and style total unrealized return
    totalUnrealisedReturn.textContent = formatNumber(unrealizedReturn);
    totalUnrealisedReturn.style.color = unrealizedReturn >= 0 ? 'green' : 'red';

    // Display and style total return
    totalReturnElement.textContent = formatNumber(totalReturn);
    totalReturnElement.style.color = totalReturn > 0 ? 'green' : totalReturn < 0 ? 'red' : 'white';

}

// Function to generate fake stock prices for testing
function generateFakeStockPrices(symbols) {
    const fakePrices = {};

    symbols.forEach(symbol => {
        // Generate a random stock price between 50 and 200
        const randomPrice = Math.random() * (1000 - 100) + 50;
        fakePrices[symbol] = parseFloat(randomPrice.toFixed(2)); // Round to two decimal places
    });

    return fakePrices;
}

function TotalReturn(userData) {
    // Assume the total return is stored in userData with the key "return"
    return userData.return || 0;
}



// Function to calculate total unrealized return
async function calculateTotalUnrealizedReturn(userData) {
    const stocksOwn = userData.stocksOwn;

    if (!stocksOwn || stocksOwn.length === 0) {
        return 0; // If no stocks owned, unrealized return is 0
    }

    // Example usage: for testting purpose delete before using
    //const symbolsToTest = ['AAPL', 'GOOGL', 'TSLA'];
    //const fakeStockPrices = generateFakeStockPrices(symbolsToTest);
    
    // Fetch real-time stock prices for symbols in stocksOwn
    const symbols = stocksOwn.map(stock => stock.symbol);
    const stockPrices = await fetchRealTimeStockPrices(symbols);

    // Calculate total unrealized return for all stocks
    const totalUnrealizedReturn = stocksOwn.reduce((total, stock) => {
        const currentStockPrice = stockPrices[stock.symbol];
        const unrealizedReturn = (currentStockPrice - stock.avgCost) * stock.shares;
        return total + unrealizedReturn;
    }, 0);

    return totalUnrealizedReturn;
}


// Function to calculate total equity
async function calculateTotalEquity(userData) {
    const totalEquity = await calculateEquity(userData.stocksOwn);
    return totalEquity;
}

function totalCash(userData) {
    const cashAmount = userData.stockCurrency ?? 0;
    return cashAmount;
}

async function calculatetotalInvestment(userData){
    const totalEquity = await calculateTotalEquity(userData);
    const cash = totalCash(userData);

    return totalEquity + cash;
}

// Function to calculate equity for a specific set of stocks
async function calculateEquity(stocksOwn) {
    if (!stocksOwn || stocksOwn.length === 0) {
        return 0;
    }

    // Fetch real-time stock prices for symbols in stocksOwn
    const symbols = stocksOwn.map(stock => stock.symbol);
    const stockPrices = await fetchRealTimeStockPrices(symbols);

    // Calculate total value of current stocks
    const equity = stocksOwn.reduce((total, stock) => {
        const currentStockPrice = stockPrices[stock.symbol];
        const stockValue = currentStockPrice * stock.shares;
        return total + stockValue;
    }, 0);

    return equity;
}

async function fetchRealTimeStockPrices(symbols) {
    const apiKey = 'cmu8s39r01qsv99m4llgcmu8s39r01qsv99m4lm0';
    const apiUrl = 'https://finnhub.io/api/v1/quote';
    const stockPrices = {};

    for (const symbol of symbols) {
        try {
            const url = `${apiUrl}?symbol=${symbol}&token=${apiKey}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();

            if (data && data.c) {
                stockPrices[symbol] = data.c;
            } else {
                stockPrices[symbol] = 0;
            }
        } catch (error) {
            console.error(`Error fetching real-time stock price for ${symbol}:`, error.message);
            stockPrices[symbol] = 0; // Set a default value in case of an error
        }
    }

    return stockPrices;
}


// Function to format a number with 2 decimal places
function formatNumber(number) {
    const parsedNumber = parseFloat(number);
    if (!isNaN(parsedNumber)) {
        return parsedNumber.toFixed(2);
    }
    return 'N/A'; // Return a default value if the number is not valid
}


function initializeUserProfileGraph(unrealizedReturnData, realizedReturnData, startDate, endDate) {
    const dateRange = generateDateRange(startDate, endDate);

    // Convert objects to arrays
    const unrealizedDataArray = mapDataToArray(unrealizedReturnData);
    const realizedDataArray = mapDataToArray(realizedReturnData);

    // Check if unrealizedDataArray and realizedDataArray are defined and have the expected structure
    if (!unrealizedDataArray || !Array.isArray(unrealizedDataArray) || !realizedDataArray || !Array.isArray(realizedDataArray)) {
        console.error('Invalid data structure for unrealizedDataArray or realizedDataArray.');
        return;
    }

    const chartData = {
        labels: dateRange.map(date => formatDate(date)),
        datasets: [
            {
                label: 'Unrealized Return',
                data: mapDataToDates(unrealizedDataArray, dateRange),
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
            },
            {
                label: 'Realized Return',
                data: mapDataToDates(realizedDataArray, dateRange),
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1,
            },
        ],
    };

    const ctx = document.getElementById('user-chart').getContext('2d');
    const userChart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                },
            },
        },
    });
}

function mapDataToArray(dataObject) {
    if (dataObject && typeof dataObject === 'object') {
        return Object.entries(dataObject).map(([date, value]) => ({ date, value }));
    } else {
        return [];
    }
}

// Generate an array of dates in the range
function generateDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateRange = [];

    for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
        dateRange.push(new Date(date));
    }

    return dateRange;
}

// Map data to dates, filling in null for missing dates
function mapDataToDates(data, dateRange) {
    const dataMap = new Map(data.map(entry => [entry.date, entry.value]));
    return dateRange.map(date => {
        const formattedDate = formatDate(date);
        return dataMap.get(formattedDate) || 0;
    });
}

// Format date for display
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Function to initialize the holdings table
async function initializeHoldingsTable(userData) {
    const holdingsContainer = document.getElementById('holdings-container');

    // Clear existing stock cards
    holdingsContainer.innerHTML = '';

    // Check if userData has stocksOwn array
    if (userData.stocksOwn && Array.isArray(userData.stocksOwn) && userData.stocksOwn.length > 0) {
        // Create an array of promises for each stock
        const promises = userData.stocksOwn.map(async (stock) => {
            const equity = await calculateEquityForStock(stock);
            return {
                symbol: stock.symbol,
                equity: formatNumber(equity),
                shares: formatNumber(stock.shares),
            };
        });

        // Wait for all promises to resolve
        const results = await Promise.all(promises);

        // Iterate over the results and create a card for each stock
        results.forEach(result => {
            const card = document.createElement('div');
            card.className = 'stock-card bg-white rounded-lg shadow-md p-4 hover:cursor-pointer';
            card.setAttribute('data-symbol', result.symbol); // Set the data-symbol attribute
            card.setAttribute('data-equity', result.equity); // Set the data-equity attribute
            card.setAttribute('data-shares', result.shares); // Set the data-shares attribute
        
            // Symbol section
            const symbolSection = document.createElement('div');
            symbolSection.className = 'symbol text-lg font-semibold mb-2';
            symbolSection.textContent = result.symbol;
        
            // Details section
            const detailsSection = document.createElement('div');
            detailsSection.className = 'flex justify-between';
        
            // Equity column
            const equityColumn = document.createElement('div');
            equityColumn.className = 'mr-4';
            const equityLabel = document.createElement('p');
            equityLabel.className = 'text-gray-600';
            equityLabel.textContent = 'Equity:';
            const equityValue = document.createElement('p');
            equityValue.textContent = result.equity;
            equityColumn.appendChild(equityLabel);
            equityColumn.appendChild(equityValue);
        
            // Shares column
            const sharesColumn = document.createElement('div');
            const sharesLabel = document.createElement('p');
            sharesLabel.className = 'text-gray-600';
            sharesLabel.textContent = 'Shares:';
            const sharesValue = document.createElement('p');
            sharesValue.textContent = result.shares;
            sharesColumn.appendChild(sharesLabel);
            sharesColumn.appendChild(sharesValue);
        
            detailsSection.appendChild(equityColumn);
            detailsSection.appendChild(sharesColumn);
        
            // Append sections to the card
            card.appendChild(symbolSection);
            card.appendChild(detailsSection);
        
            // Append card to the container
            holdingsContainer.appendChild(card);
        
            // Add event listener to the card
            card.addEventListener('click', async () => {
                const symbol = card.getAttribute('data-symbol');
                const shares = parseFloat(card.getAttribute('data-shares'));
                const equity = parseFloat(card.getAttribute('data-equity'));
            
                // Fetch real-time stock prices for the specific symbol
                const stockPrices = await fetchRealTimeStockPrices([symbol]);

                // Extract the current price from the stockPrices object
                const currentPrice = stockPrices[symbol];
            
                // Call the function to open the sell modal with stock details
                openSellModal({
                    symbol,
                    shares,
                    currentPrice,
                    equity
                });
            });

        });
    } else {
        // Display a message if the user has no holdings
        const noHoldingsMessage = document.createElement('p');
        noHoldingsMessage.className = 'text-gray-600';
        noHoldingsMessage.textContent = 'No holdings available.';
        holdingsContainer.appendChild(noHoldingsMessage);
    }
}

// Function to calculate equity for a specific stock
async function calculateEquityForStock(stock) {
    // Fetch real-time stock price for the symbol
    const stockPrices = await fetchRealTimeStockPrices([stock.symbol]);
    const currentStockPrice = stockPrices[stock.symbol] || 0;

    // Calculate equity for the stock
    const equity = currentStockPrice * stock.shares;
    
    return equity;
}


// Function to open the sell modal with stock details
async function openSellModal(stockDetails) {
    const sellModal = document.getElementById('sellModal');
    const stockDetailsContainer = document.getElementById('stockDetails');
    const sellAmountInput = document.getElementById('sellAmount');

    // Populate stock details in the modal
    stockDetailsContainer.innerHTML = `
        <p class="mb-2"><strong>Symbol:</strong> ${stockDetails.symbol}</p>
        <p class="mb-2"><strong>Shares:</strong> ${formatNumber(stockDetails.shares)}</p>
        <p class="mb-2"><strong>Current Price:</strong> $${formatNumber(stockDetails.currentPrice)}</p>
        <p class="mb-2"><strong>Equity:</strong> $${formatNumber(stockDetails.equity)}</p>
    `;

    // Open the modal
    sellModal.classList.remove('hidden');

    // Event listener for the sell button
    const sellButton = document.getElementById('sellButton');
    sellButton.addEventListener('click', async () => {
        const sellAmount = parseFloat(sellAmountInput.value);
        await sellStock(stockDetails, sellAmount);
        // Close the modal after selling
        sellModal.classList.add('hidden');
    });

    // Event listener for the close button
    const closeModalButton = document.getElementById('closeModal');
    closeModalButton.addEventListener('click', () => {
        // Close the modal when the close button is clicked
        sellModal.classList.add('hidden');
    });
}



async function fetchFinancialNews(apiKey) {
    const marketNewsEndpoint = `https://finnhub.io/api/v1/news?category=general&token=${apiKey}`;

    // Get the news container element
    const newsContainer = document.getElementById('daily-news-container');

    // Make API request using fetch
    try {
        const response = await fetch(marketNewsEndpoint);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const articles = data;

        // Process the news data and update the news container
        const newsHTML = articles.map(async (article) => {
            try {
                return `
                    <div class="font-serif news-item bg-gray-100 flex flex-col border rounded-md shadow-md p-4 w-80 h-96 hover:scale-105 transition-all duration-300 ease-in-out">
                        <img src="${article.image}" alt="Stock Image" class="news-image h-36 object-cover mb-4 rounded-md"> 
                        <div class="news-content flex flex-col flex-grow">
                            <div class="text-lg font-semibold news-title overflow-hidden whitespace-normal h-full">
                                ${article.headline}
                            </div>
                            <a href="${article.url}" target="_blank" class="text-blue-500 news-link mt-auto">Read more</a>
                        </div>
                    </div>
                `;
            } catch (error) {
                console.error('Error fetching Pexels image:', error.message);
                return '';
            }
        });

        Promise.all(newsHTML)
            .then((resolvedNews) => {
                newsContainer.innerHTML = `
                    <div class="flex items-center">
                        ${resolvedNews.join('')}
                    </div>
                `;
            })
            .catch((error) => {
                console.error('Error processing news:', error.message);
            });
    } catch (error) {
        console.error('Error fetching news:', error.message);
    }
}

function getCurrentSeasonDates() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    let startMonth, endMonth;

    // Determine the current season based on the month
    if (currentDate.getMonth() >= 0 && currentDate.getMonth() < 3) {
        // Winter: January 1st to March 31st
        startMonth = 0; // January
        endMonth = 2;   // March
    } else if (currentDate.getMonth() >= 3 && currentDate.getMonth() < 6) {
        // Spring: April 1st to June 30th
        startMonth = 3; // April
        endMonth = 5;   // June
    } else if (currentDate.getMonth() >= 6 && currentDate.getMonth() < 9) {
        // Summer: July 1st to September 30th
        startMonth = 6; // July
        endMonth = 8;   // September
    } else {
        // Fall: October 1st to December 31st
        startMonth = 9; // October
        endMonth = 11;  // December
    }

    const startDate = new Date(currentYear, startMonth, 1);
    const endDate = new Date(currentYear, endMonth + 1, 0);

    return { startDate, endDate };
}


async function sellStock(stockDetails, sellAmount) {
    try {
        const symbol = stockDetails.symbol;
        const userInfo = getUserData();
        const userId = userInfo._id.toString();
        const userData = await getUserInfo(userId); 

        if (!userData) {
            alert('Error: User not found.');
            return;
        }

        const stocksOwn = userData.stocksOwn;

        // Find the stock in the user's portfolio
        const stockIndex = stocksOwn.findIndex(stock => stock.symbol === symbol);

        if (stockIndex !== -1) {
            const currentStock = stocksOwn[stockIndex];
            const currentStockShares = parseFloat(currentStock.shares);
            const sellAmountNumber = parseFloat(sellAmount);
            const remainingShares = currentStockShares - sellAmountNumber;

            if (remainingShares >= 0) {
                // Deduct the sold shares from the current stock
                currentStock.shares = remainingShares;

                // Calculate the total earnings from the sale
                const sellPrice = stockDetails.currentPrice;
                const totalEarnings = sellPrice * sellAmount;

                // Deduct the total cost and update the return data
                userData.totalCost -= totalEarnings;
                userData.return += totalEarnings;

                // Add the sale data to the sell data array
                const sellData = {
                    symbol,
                    sellAmount,
                    sellPrice,
                    totalEarnings,
                    sellDate: new Date().toISOString(),
                };
                

                // Update the user's data on the server
                const response = await fetch(`http://localhost:8082/sellStocks?userId=${userId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userId,
                        stockSymbol: sellData.symbol,     
                        sharesToSell: sellData.sellAmount,
                        stockPrice: sellData.sellPrice     
                    }),
                });

                if (!response.ok) {
                    throw new Error('Failed to update user data on the server');
                }

                const updatedUserData = await response.json();
                console.log('User data updated successfully on the server:', updatedUserData);

                // Display updated financial information
                await displayFinancialInformation({
                    ...userData
                });
            } else {
                console.log('exist');
                alert('You cannot sell more shares than you own.');
            }
        } else {
            alert('Error: Stock not found in your portfolio.');
        }

    } catch (error) {
        console.error('Error selling stock:', error);
    }
}




async function fetchDataAndDisplay() {
    try {
        const userData = await getUserInfo(); 
        displayFinancialInformation(userData);
        const { startDate, endDate } = getCurrentSeasonDates();
        const unrealizedReturnData = userData.UnReturn;
        const realizedReturnData = userData.dayReturn;
        initializeUserProfileGraph(unrealizedReturnData, realizedReturnData, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);  
        initializeHoldingsTable(userData);
        } catch (error) {
        console.error('Error fetching user data:', error);
    }
}


async function afterLogin() {
    const userInfo = await getUserData();
      userId = userInfo._id;
      // Make a request to the server to update the last login date
      const response = await fetch(`http://localhost:8082/updateLastLogin?userId=${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      location.reload();
}

function showPopupLogIn() {
    const dailyModal = document.getElementById('dailyLoginModal');
    if (dailyModal) {
        dailyModal.classList.remove('hidden');
    }
}


async function checkDailyLogin() {
    const userInfo = await getUserData(); 
    const userId = userInfo._id
    const response = await fetch(`http://localhost:8082/getLastLogin?userId=${userId}`);
    const data = await response.json();

    const lastLoginDate = new Date(data.lastLogin) || [];
    const currentDate = new Date();

    if (
        lastLoginDate.getDate() !== currentDate.getDate() ||
        lastLoginDate.getMonth() !== currentDate.getMonth() ||
        lastLoginDate.getFullYear() !== currentDate.getFullYear()
    ) {
        showPopupLogIn();
    }
}



const claimBonus = document.getElementById('claimBonusBtn');

if (claimBonus) {
    claimBonus.addEventListener("click", async () => {
        console.log('h')
        const dailyModal = document.getElementById('dailyLoginModal');
        dailyModal.classList.add('hidden');
        afterLogin();
    });
}


const apiKey = 'cmu8s39r01qsv99m4llgcmu8s39r01qsv99m4lm0';

checkDailyLogin();
fetchDataAndDisplay();
fetchAndUpdateLocalVariable();
fetchFinancialNews(apiKey);

