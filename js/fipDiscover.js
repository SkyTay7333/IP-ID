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
      alert('Invalid user info or user ID not found.');
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
  }
}

async function getUserInfo() {
  await fetchAndUpdateLocalVariable();
  return userDataFromMongoDB || {};
}

const fetchStockData = async () => {
    try {
        const apiKey = 'cmu8s39r01qsv99m4llgcmu8s39r01qsv99m4lm0';

        const apiUrl = `https://finnhub.io/api/v1/stock/symbol?exchange=US&token=${apiKey}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
            if (response.status === 429) {
                window.location.href = 'over.html';
            } else {
                throw new Error(`Error fetching stock data. Status: ${response.status}`);
            }
        }

        const stockData = await response.json();
        return stockData;
    } catch (error) {
        console.error('Error fetching stock data:', error);
    }
};

const fetchStockInfo = async (symbol) => {
    try {
        const apiKey = 'cmu8s39r01qsv99m4llgcmu8s39r01qsv99m4lm0';
        const apiUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
            if (response.status === 403) {
                console.error(`Forbidden error: Unable to fetch stock data for ${symbol}.`);
                return { c: undefined, d: undefined, dp: undefined };
            } else {
                throw new Error(`Error fetching stock data. Status: ${response.status}`);
            }
        }

        const stockInfo = await response.json();
        return stockInfo;
    } catch (error) {
        console.error(`Error fetching stock information for ${symbol}:`, error);
        return { c: undefined, d: undefined, dp: undefined };
    }
};

const getRandomStocks = (stocks, count) => {
    const shuffledStocks = stocks.sort(() => Math.random() - 0.5);
    const randomStocks = shuffledStocks.slice(0, count);
    return randomStocks;
};

const renderStocks = async (stocks) => {
    const mainContent = document.querySelector('.grid');

    mainContent.innerHTML = '';

    for (const stock of stocks) {
        const stockCard = document.createElement('div');
        stockCard.className = 'bg-white p-4 rounded-md shadow-md hover:cursor-pointer';

        const stockInfo = await fetchStockInfo(stock.symbol);

        stockCard.innerHTML = `
            <h3 class="text-2xl font-semibold mb-4">${stock.symbol}</h3>
            <p class="text-lg text-blue-500 mb-2">Current Price: $${stockInfo.c}</p>
            <p class="text-sm text-gray-500">Change: $${stockInfo.d} (${stockInfo.dp}%)</p>
        `;

        // Add click event listener to each stock card
        stockCard.addEventListener('click', () => {
            searchStock(stock.symbol);
        });

        mainContent.appendChild(stockCard);
    }
};


const fetchDataAndRender = async () => {
    try {
        const stocks = await fetchStockData();
        const randomStocks = getRandomStocks(stocks, 9);
        await renderStocks(randomStocks);
    } catch (error) {
        console.error('Error fetching and rendering data:', error);
    }
};

// Add this function to your JavaScript file (e.g., stocks.js)
const fetchAndRenderDailyStocks = async () => {
    try {
        const apiKey = 'cmu8s39r01qsv99m4llgcmu8s39r01qsv99m4lm0';

        const symbols = ['AAPL', 'GOOGL', 'TSLA', 'S&P500'];
        const dailyStocksContainer = document.getElementById('dailyStocks');

        const fetchStockData = async (symbol) => {
            // Fetch quote data
            const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;
            const quoteResponse = await fetch(quoteUrl);
            const quoteData = await quoteResponse.json();

            // Fetch profile data to get the company name
            const profileUrl = `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${apiKey}`;
            const profileResponse = await fetch(profileUrl);
            const profileData = await profileResponse.json();

            return { symbol, name: profileData.name, ...quoteData };
        };

        const renderStockCard = (stock) => {
            const stockCard = document.createElement('div');
            stockCard.className = 'flex w-1/3 bg-white p-4 rounded-md shadow-md mr-4 hover:cursor-pointer';

            // Determine the color based on the change value
            const colorClass = stock.dp >= 0 ? 'text-green-500' : 'text-red-500';

            stockCard.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex-grow pr-4">
                        <div class="text-lg font-semibold text-blue-500 overflow-hidden whitespace-nowrap overflow-ellipsis max-w-full">
                            ${stock.symbol}
                        </div>
                        <div class="text-sm text-gray-500 overflow-hidden whitespace-nowrap overflow-ellipsis max-w-full">
                            ${stock.name}
                        </div>
                    </div>
                    <div class="flex-shrink-0">
                        <p class="text-sm ${colorClass}">${stock.dp >= 0 ? '+' : ''}${stock.dp}%</p>
                        <p class="text-sm font-semibold">$${stock.c}</p>
                    </div>
                </div>
            `;

            // Add click event listener to each stock card
            stockCard.addEventListener('click', () => {
                // Trigger the search for the clicked stock symbol
                searchStock(stock.symbol);
            });

            return stockCard;
        };

        const stocksData = await Promise.all(symbols.map(fetchStockData));

        stocksData.forEach((stock) => {
            const stockCard = renderStockCard(stock);
            dailyStocksContainer.appendChild(stockCard);
        });
    } catch (error) {
        console.error('Error fetching and rendering daily stocks:', error);
    }
};

const showError = (content) => {
    const errorModal = document.getElementById('errorModal');
    const errorModalContent = document.getElementById('errorContent');

    errorModalContent.innerHTML = content;
    errorModal.classList.remove('hidden');
};

const openModal = (content) => {
    const modal = document.getElementById('stockModal');
    const modalContent = document.getElementById('modalContent');
    const modalWidth = '400px';
    const modalHeight = '300px';

    modalContent.innerHTML = content;
    modalContent.style.width = modalWidth;
    modalContent.style.height = modalHeight;

    modal.classList.remove('hidden');
};

const closeModal = () => {
    const modal = document.getElementById('stockModal');
    const errorModal = document.getElementById('errorModal');

    if (modal && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
    } else if (errorModal && !errorModal.classList.contains('hidden')) {
        errorModal.classList.add('hidden');
    }
};


function calculateStocksToBuy(stockPrice, userInvestment) {
    const stocksToBuy = userInvestment / stockPrice;
    return stocksToBuy.toFixed(2); // Limit to two decimal places
}

let stocksToBuyDollars;
let stocksToBuyShares;

// Function to handle input changes and update information for dollars
const handleInvestmentInputChange = () => {
    const investmentInput = document.getElementById('investmentInput');
    const sharesInput = document.getElementById('sharesInput');
    const stockPriceElement = document.getElementById('stockPrice');

    // Extract numeric value from the stock price element
    const stockPriceString = stockPriceElement.innerText;
    const stockPrice = parseFloat(stockPriceString.replace(/[^0-9.-]+/g, ''));

    const userInvestment = parseFloat(investmentInput.value) || 0;

    stocksToBuyDollars = calculateStocksToBuy(stockPrice, userInvestment);
    const totalSharesInfo = `With $${userInvestment}, you can buy ${stocksToBuyDollars} shares.`;

    document.getElementById('totalSharesInfo').innerText = totalSharesInfo;

    // Update the value of the shares input field
    const userShares = calculateSharesToBuy(stockPrice, userInvestment);
    sharesInput.value = userShares;
};

// Function to handle input changes and update information for shares
const handleSharesInputChange = () => {
    const sharesInput = document.getElementById('sharesInput');
    const stockPriceElement = document.getElementById('stockPrice');

    // Extract numeric value from the stock price element
    const stockPriceString = stockPriceElement.innerText;
    const stockPrice = parseFloat(stockPriceString.replace(/[^0-9.-]+/g, ''));

    const userShares = parseFloat(sharesInput.value) || 0;

    stocksToBuyShares = userShares;
    const totalSharesInfo = `With ${userShares} shares, it will cost $${(userShares * stockPrice).toFixed(2)}.`;

    document.getElementById('totalSharesInfo').innerText = totalSharesInfo;

    // Update the value of the investment input field
    const userInvestment = calculateInvestment(stockPrice, userShares);
    document.getElementById('investmentInput').value = userInvestment;
};

// Function to calculate the number of shares user can buy based on investment in dollars
const calculateSharesToBuy = (stockPrice, userInvestment) => {
    const sharesToBuy = userInvestment / stockPrice;
    return sharesToBuy.toFixed(2); // Limit to two decimal places
};

// Function to calculate the investment amount based on the number of shares
const calculateInvestment = (stockPrice, userShares) => {
    const investmentAmount = userShares * stockPrice;
    return investmentAmount.toFixed(2); // Limit to two decimal places
};

const searchStock = async (query) => {
    try {
        const apiKey = 'cmu8s39r01qsv99m4llgcmu8s39r01qsv99m4lm0';

        const symbolSearchUrl = `https://finnhub.io/api/v1/search?q=${query}&token=${apiKey}`;
        const symbolSearchResponse = await fetch(symbolSearchUrl);
        const symbolSearchData = await symbolSearchResponse.json();

        if (symbolSearchData.count > 0) {
            const firstResult = symbolSearchData.result[0];
            const stockInfo = await fetchStockInfo(firstResult.symbol);

            const isErrorMessage = stockInfo.c === undefined;

            let content = '';
            if (isErrorMessage) {
                content = `<p class="text-red-500">Currently not available. Try again later.</p>`;
                showError(content);
            } else {
                content = `
                    <h3 id="stockSymbol" class="text-2xl font-semibold mb-4">${firstResult.symbol}</h3>
                    <p id="stockPrice" class="text-lg text-blue-500 mb-2">Current Price: $${stockInfo.c}</p>
                    <p class="text-sm text-gray-500">Change: $${stockInfo.d} (${stockInfo.dp}%)</p>
                    <div class="mt-4 relative">
                        <label for="investmentInput" class="block text-sm font-medium text-gray-700">Investment Amount:</label>
                        <input type="number" id="investmentInput" class="mt-1 p-2 border rounded-md w-full" placeholder="Enter amount" onInput="handleInvestmentInputChange()">
                    </div>
                    <div class="mt-4 relative">
                        <label for="sharesInput" class="block text-sm font-medium text-gray-700">Number of Shares:</label>
                        <input type="number" id="sharesInput" class="mt-1 p-2 border rounded-md w-full" placeholder="Enter shares" onInput="handleSharesInputChange()">
                    </div>
                    <p id="totalSharesInfo" class="mt-4">With $0, you can buy 0 shares.</p>
                `;
                openModal(content);
            }
        }

    } catch (error) {
        const errorContent = `<p class="text-red-500">Error: Currently not available. Please try again later.</p>`;
        showError(errorContent);
    }
};

// Function to handle the buy button click
const handleBuyButtonClick = async () => {
    try {
        // Get user ID from local storage
        const userInfo = await getUserData();
        const userId = userInfo._id;

        if (!userId) {
            console.error('User ID not found in userInfo.');
            return;
        }

        // Get stock details from the modal content
        const stockSymbolElement = document.getElementById('stockSymbol');
        const sharesInputElement = document.getElementById('sharesInput');
        const stockPriceElement = document.getElementById('stockPrice');

        if (!stockSymbolElement) {
            console.error('Stock symbol element not found.');
            return;
        }

        if (!sharesInputElement) {
            console.error('Shares input element not found.');
            return;
        }

        if (!stockPriceElement) {
            console.error('Stock price element not found.');
            return;
        }

        const stockSymbol = stockSymbolElement.innerText;
        const sharesToBuy = parseFloat(sharesInputElement.value) || 0;
        const stockPriceText = stockPriceElement.innerText;
        const stockPrice = parseFloat(stockPriceText.replace(/[^0-9.-]+/g, ''));

        // Make a request to the server to buy stocks
        const response = await fetch('http://localhost:8082/buyStocks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId,
                stockSymbol,
                sharesToBuy,
                stockPrice,
            }),
        });

        const responseData = await response.json(); 

        if (response.ok) {
            // Refresh user data in variable
            await fetchAndUpdateLocalVariable();
            closeModal();
        } else {
            // Use responseData here for error handling
            alert(`Error: ${responseData.error}`);
        }
    } catch (error) {
        console.error('Unexpected error:', error);
        alert('Unexpected error. Try again later')
    }
};
  

// Call the function when the DOM is loaded
document.addEventListener('DOMContentLoaded', fetchAndRenderDailyStocks);
document.addEventListener('DOMContentLoaded', fetchDataAndRender);
document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('closeErrorModal').addEventListener('click', closeModal);
document.getElementById('searchForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const searchInput = document.getElementById('searchBarInput');
    const searchTerm = searchInput.value.trim();
    if (searchTerm) {
        searchStock(searchTerm);
    }
});
document.addEventListener('click', (event) => {
    const stockCard = event.target.closest('.stock-card');
    if (stockCard) {
        const symbol = stockCard.dataset.symbol;
        searchStock(symbol);
    }
});

const buyButton = document.getElementById('buyButton');
if (buyButton) {
  buyButton.addEventListener('click', handleBuyButtonClick);
}


document.addEventListener('DOMContentLoaded', async function() {
    try {
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Hide loading animation
        document.getElementById('loading-animation').classList.add('hidden');

        // Show main content
        document.getElementById('mainContent').classList.remove('hidden');
    } catch (error) {
        console.error('Error during DOMContentLoaded:', error);
    }
});