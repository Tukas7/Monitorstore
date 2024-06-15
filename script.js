document.addEventListener('DOMContentLoaded', function() {
    fetchProducts();
    fetchCartItems();
    const userName = localStorage.getItem('userName');
    if (userName) {
        updateUI(userName);
    }

    const cartCount = localStorage.getItem('cartCount');
    if (cartCount) {
        document.getElementById('cartCount').textContent = cartCount;
    }
});

function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
}

function showRegistrationForm() {
    document.getElementById('registerForm').style.display = 'block';
}

function closeModallogin() {
    document.getElementById('loginForm').style.display = 'none';
}
function closeModalProf() {
    document.getElementById('userProfile').style.display = 'none';
}
function closeModalReg() {
    document.getElementById('registerForm').style.display = 'none';
}

function login(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(response => {
        if (!response.ok) throw new Error('Login failed');
        return response.json();
    })
    .then(data => {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('userName', data.userName);  // Сохранение имени пользователя
        localStorage.setItem('email', email);
        
        updateUI(data.userName);  // Обновление интерфейса
        closeModallogin();
        alert('Logged in successfully!');
        updateCartCount();
    })
    .catch(err => {
        alert(err.message);
    });
}


function updateUI(userName) {
    const loginRegisterDiv = document.getElementById('login-register');
    const userProfileDiv = document.getElementById('user-profile');
    loginRegisterDiv.style.display = 'none';  // Скрываем кнопки регистрации и входа
    userProfileDiv.style.display = 'block';  // Показываем профиль пользователя
    document.getElementById('user-name-display').textContent = userName;  // Устанавливаем имя пользователя
}



function register(event) {
    event.preventDefault();
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
    }).then(response => {
        if (!response.ok) throw new Error('Registration failed');
        return response.text();
    }).then(() => {
        alert('Registered successfully!');
        closeModal('registerForm');
    }).catch(err => {
        alert(err.message);
    });
}




function showUserProfile() {
    const userId = localStorage.getItem('userId'); // Убедитесь, что userId сохраняется в localStorage
    if (!userId) {
        alert('You are not logged in');
        return;
    }

    fetch(`/user/${userId}`)
        .then(response => response.json())
        .then(user => {
            // Заполнение информации профиля пользователя
            document.getElementById('userInfo').innerHTML = `
                <div class="profile-card">
                    <h2>${user.username}</h2>
                    <p><strong>Email:</strong> ${user.email}</p>
                    <button onclick="logout()">Выйти</button>
                </div>
            `;

            console.log(localStorage);
            return fetch(`/orders/${userId}`);
        })
        .then(response => response.json())
        .then(orders => {
            // Создание HTML-контента для каждого заказа
            const orderList = document.getElementById('orderHistory');
            orderList.innerHTML = orders.map(order => `
                <li class="order-card">
                    <p><strong>Дата заказа:</strong> ${new Date(order.order_date).toLocaleString()}</p>
                    <p><strong>Дата доставки:</strong> ${new Date(order.delivery_estimate).toLocaleString()}</p>
                    <p><strong>Статус:</strong> ${order.statuquantitys}</p>
                    <p><strong>Город:</strong> ${order.city}</p>
                    <p><strong>Адрес доставки</strong> ${order.delivery_address}</p>
                    <p><strong>Итоговая цена:</strong> ${order.total.toFixed(2)}₽</p>
                    <p><strong>Тип оплаты:</strong> ${order.payment_type}</p>
                    <ul>
                        ${order.items.map(item => `
                            <li><strong>${item.name}:</strong> ${item.quantity} x $${item.price.toFixed(2)}</li>
                        `).join('')}
                    </ul>
                </li>
            `).join('');

            // Добавление стиля, если необходимо
            document.getElementById('orderHistory').classList.add('styled-order-list');
        })
        .catch(error => console.error('Error loading profile:', error));

    // Показ блока с профилем пользователя
    document.getElementById('userProfile').style.display = 'block';
}




function editUserProfile() {
    const userName = localStorage.getItem('userName');
    const userEmail = localStorage.getItem('email'); // Предполагаем, что email также сохранен в sessionStorage
    document.getElementById('userInfo').innerHTML = `
        <form onsubmit="submitUserProfile(event)">
            <input type="text" id="edit-username" placeholder="Username" value="${userName}" required>
            <input type="email" id="edit-email" placeholder="Email" value="${userEmail}" required>
            <button type="submit">Сохранить изменения</button>
        </form>
    `;
}

function submitUserProfile(event) {
    event.preventDefault();
    const userId = sessionStorage.getItem('userId');
    const updatedUserName = document.getElementById('edit-username').value;
    const updatedEmail = document.getElementById('edit-email').value;

    fetch(`/user/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: updatedUserName, email: updatedEmail })
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to update user profile');
        sessionStorage.setItem('userName', updatedUserName);
        sessionStorage.setItem('userEmail', updatedEmail);
        alert('Profile updated successfully');
        showUserProfile(); // Обновите профиль пользователя для отображения новых данных
    })
    .catch(err => {
        alert(err.message);
    });
}





function fetchProducts() {
    fetch('/products')
        .then(response => response.json())
        .then(products => {
            const productList = document.getElementById('productList');
            productList.innerHTML = products.map(product => `
                <div class="product-card" onclick="showProductDetails(${product.id})">
                    <img src="${product.image_url}" alt="${product.name}">
                    <h3>${product.name}</h3>
                    <p>$${product.price}</p>
                    <button>Add to Cart</button>
                </div>
            `).join('');
        })
        .catch(err => console.error('Error loading products:', err));
}

function showProductDetails(productId) {
    fetch(`/products/${productId}`)
        .then(response => {
            if (!response.ok) throw new Error(`Failed to fetch product with status: ${response.status}`);
            return response.json();
        })
        .then(product => {
            document.getElementById('modalTitle').textContent = product.name;
            document.getElementById('modalDescription').textContent = product.description;
            document.getElementById('modalImage').src = product.image_url || 'placeholder-image.jpg';
            document.getElementById('modalImage').alt = `Image of ${product.name}`;
            const addToCartButton = document.getElementById('modalAddToCartButton');
            addToCartButton.onclick = function() { addToCart(productId); };
            // Создание списка характеристик
            let specificationsHtml = `
                <li><img class="imghar" src="uploads/category.png" alt="">Категория: ${product.category}</li>
                <li><img class="imghar" src="uploads/diagonal.png" alt="">Диагональ: ${product.screen_size}"</li>
                <li><img class="imghar" src="uploads/razresh.png" alt="">Разрешение: ${product.resolution}</li>
                <li><img class="imghar" src="uploads/Chastota.png" alt="">Частота обновления: ${product.refresh_rate} Гц</li>
                <li><img class="imghar" src="uploads/Vremya.png" alt="">Время отклика: ${product.response_time} мс</li>
                <li><img class="imghar" src="uploads/Type.png" alt="">Тип матрицы: ${product.panel_type}</li>
            `;

            document.getElementById('modalSpecifications').innerHTML = specificationsHtml;
            document.getElementById('productModal').style.display = 'block';
        })
        .catch(err => {
            console.error('Error loading product details:', err);
            alert('Error loading product details: ' + err.message);
        });
}



function closeModalprod() {
    document.getElementById('productModal').style.display = 'none';
}





function applyFilters() {
    const searchValue = document.getElementById('searchInput').value;
    const categoryValue = document.getElementById('categoryFilter').value;
    const sizeValue = document.getElementById('sizeFilter').value;
    const resolutionValue = document.getElementById('resolutionFilter').value;
    const panelTypeValue = document.getElementById('panelTypeFilter').value;
   
    const params = new URLSearchParams({
        search: searchValue,
        category: categoryValue,
        size: sizeValue,
        resolution: resolutionValue,
        panelType: panelTypeValue
    });
    
    fetch(`/search?${params.toString()}`)
        .then(response => {
            
            if (!response.ok) {
                throw new Error(`Server responded with status ${response.status}`);
            }
            
            return response.json();
            
        })
        
        .then(products => {
            displayProducts(products);
        })
        .catch(err => console.error('Error loading filtered products:', err));
        
}

function displayProducts(products) {
    const productList = document.getElementById('productList');
    productList.innerHTML = products.map(product => `
    <div class="product-card" onclick="showProductDetails(${product.id})">
        <img src="${product.image_url}" alt="${product.name}">
        <h3>${product.name}</h3>
        <p>$${product.price}</p>
        <button>Add to Cart</button>
    </div>
    `).join('');
}
function addToCart(productId) {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        alert('Please log in to add products to your cart');
        return;
    }
    fetch('/addToCart', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`  // Убедитесь, что токен передаётся
        },
        body: JSON.stringify({ userId, productId, quantity: 1 })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Товар успешно добавлен');
            updateCartCount();
        } else {
            throw new Error('Failed to add product to cart');
        }
    })
    .catch(error => {
        console.error('Error adding product to cart:', error);
        alert('Failed to add product to cart: ' + error.message);
    });
}


function updateCartCount() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        console.log("User not logged in");
        return;
    }
    fetch(`/cartCount/${userId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('cartCount').textContent = data.count;
        localStorage.setItem('cartCount', data.count); // Сохраняем количество в localStorage
    })
    .catch(error => {
        console.error('Error fetching cart count:', error);
    });
}

function toggleMenu() {
    const menu = document.querySelector('.menu');
    if (menu.style.right === '0px') {
        menu.style.right = '-100%';
    } else {
        menu.style.right = '0px';
    }
}






document.querySelectorAll('.product').forEach(item => {
    item.addEventListener('click', function() {
        const productId = this.getAttribute('data-id'); // Получаем ID продукта

        fetch(`/products/${productId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(product => {
            document.getElementById('modalTitle').innerText = product.name;
            document.getElementById('modalPrice').innerText = `${product.price} ₽`;
            document.getElementById('modalImage').src = product.image_url;
            document.getElementById('modalDescription').innerText = product.description;

            let specificationsHtml = `
                <li><img class="imghar" src="uploads/category.png" alt="">Категория: ${product.category}</li>
                <li><img class="imghar" src="uploads/diagonal.png" alt="">Диагональ: ${product.screen_size}"</li>
                <li><img class="imghar" src="uploads/razresh.png" alt="">Разрешение: ${product.resolution}</li>
                <li><img class="imghar" src="uploads/Chastota.png" alt="">Частота обновления: ${product.refresh_rate} Гц</li>
                <li><img class="imghar" src="uploads/Vremya.png" alt="">Время отклика: ${product.response_time} мс</li>
                <li><img class="imghar" src="uploads/Type.png" alt="">Тип матрицы: ${product.panel_type}</li>
            `;
            document.getElementById('modalSpecifications').innerHTML = specificationsHtml;

            const addToCartBtn = document.getElementById('add-to-cart-btn');
            if (addToCartBtn) {
                addToCartBtn.setAttribute('data-id', productId);
            } else {
                console.error('Add to Cart button not found');
            }

            document.getElementById('productModal').style.display = 'block';
        })
        .catch(error => {
            console.error('Error loading product details:', error);
            alert('Failed to load product details: ' + error.message);
        });
    });
});


// Функция для закрытия модального окна
document.querySelector('.close').addEventListener('click', function() {
    document.getElementById('productModal').style.display = 'none';
});

document.querySelectorAll('.add-to-cart-btn').forEach(button => {
    button.addEventListener('click', function(event) {
        event.stopPropagation(); // Предотвратить всплытие события
        const productId = this.getAttribute('data-id');
        addToCart(productId);
    });
});
document.getElementById('add-to-cart-btn').addEventListener('click', function() {
    const productId = this.getAttribute('data-id');
    addToCart(productId);
});


function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('email'); // Удаление информации о количестве товаров в корзине
    localStorage.removeItem('cartCount'); // Удаление информации о количестве товаров в корзине
    document.getElementById('cartCount').textContent = '0'; // Обнуление отображаемого количества
    console.log('Logged out successfully');
    // Дополнительно можно перезагрузить страницу или обновить UI
}
document.addEventListener('DOMContentLoaded', () => {
    const cartCount = localStorage.getItem('cartCount');
    if (cartCount) {
        document.getElementById('cartCount').textContent = cartCount;
    }
});
function openTab(evt, tabName) {
    // Получаем все элементы с классом "tabcontent" и скрываем их
    var tabcontent = document.getElementsByClassName("tabcontent");
    for (var i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    // Получаем все элементы с классом "tablinks" и удаляем класс "active"
    var tablinks = document.getElementsByClassName("tablinks");
    for (var i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    // Показываем текущую вкладку и добавляем класс "active" на кнопку, которая открыла вкладку
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

function showCalibrationGuide() {
    alert("Здесь будет открываться руководство по калибровке.");
}

function showOrderForm() {
    alert("Форма для заказа услуги калибровки будет здесь.");
}
document.addEventListener('DOMContentLoaded', function () {
    const slider = document.querySelector('.resize');
    const handle = document.querySelector('.handle');
    let isResizing = false;

    handle.addEventListener('mousedown', function (e) {
        isResizing = true;
    });

    document.addEventListener('mousemove', function (e) {
        if (isResizing) {
            let offsetRight = document.querySelector('.comparison-slider figure').clientWidth - e.pageX;
            slider.style.width = `${100 - (offsetRight / window.innerWidth) * 100}%`;
        }
    });

    document.addEventListener('mouseup', function () {
        isResizing = false;
    });
});
function showOrderForm() {
    document.getElementById('orderForm').style.display = 'block';
}

function closeModal() {
    document.getElementById('orderForm').style.display = 'none';
}




document.querySelectorAll('.step').forEach(step => {
    const tooltip = step.querySelector('.tooltip');
    step.addEventListener('mouseenter', () => {
        tooltip.style.visibility = 'visible';
        tooltip.style.opacity = '1';
        tooltip.style.transform = 'translateX(-50%) translateY(0)';
    });

    step.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
        tooltip.style.visibility = 'hidden';
        tooltip.style.transform = 'translateX(-50%) translateY(-10px)';
    });
});

function showCart() {
    
    window.location.href = 'cart.html';
}
   

function fetchCartItems(deliveryCost = 0) {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        console.log("User not logged in");
        return;
    }
    fetch(`/cartItems/${userId}`)
        .then(response => response.json())
        .then(data => {
            populateCart(data);
            calculateTotal(data, deliveryCost);
            
        })
        .catch(err => console.error("Failed to load cart items:", err));
}

function populateCart(items) {
    const cartTable = document.getElementById('cartItems');
    cartTable.innerHTML = '';  // Очищаем таблицу перед добавлением новых данных
    const userId = localStorage.getItem('userId');

    items.forEach(item => {
        let row = `
            <tr>
                <td><img src="${item.image_url}" alt="${item.name}" style="width:50px;"></td>
                <td>${item.name}</td>
                <td>${item.price} ₽</td>
                <td><input type="number" value="${item.quantity}" min="1" onchange="updateCartItem(${userId}, ${item.id}, this.value)"></td>
                <td>${item.price * item.quantity} ₽</td>
                <td><button onclick="removeCartItem(${userId} ,${item.id})">Удалить</button></td>
            </tr>
        `;
        cartTable.innerHTML += row;
    });
}



document.addEventListener('DOMContentLoaded', fetchCartItems);
function updateCartItem(userId, id, quantity) {
    fetch('/updateCartItem', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, id, quantity })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data.message);
        if (data.success) {
            // Обновите отображение корзины или перезагрузите страницу
            fetchCartItems();
        }
    })
    .catch(error => console.error('Failed to update cart item:', error));
}

function removeCartItem(userId, Id) {
    fetch(`/removeCartItem/${userId}/${Id}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        console.log(data.message);
        if (data.success) {
            // Обновите отображение корзины или перезагрузите страницу
            fetchCartItems();
        }
    })
    .catch(error => console.error('Failed to remove cart item:', error));
}

function updateTotal() {
    const deliveryCost = parseFloat(document.querySelector('input[name="delivery"]:checked').value);
    fetchCartItems(deliveryCost); // Передаем стоимость доставки в функцию загрузки товаров
}
function calculateTotal(data, deliveryCost) {
    let total = 0;
    data.forEach(item => {
        total += item.price * item.quantity;
    });
    total += deliveryCost; // Прибавляем стоимость доставки к общей сумме
    document.getElementById('totalPrice').textContent = total.toFixed(2);  // Обновляем отображаемую итоговую сумму
}


function goToStep(step) {
    document.querySelectorAll('.form-step').forEach(stepDiv => {
        stepDiv.classList.remove('active');
    });
    document.querySelector(`.form-step[data-step="${step}"]`).classList.add('active');
}


function fetchCartItem() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        console.log("User not logged in");
        return;
    }
    fetch(`/cartItems/${userId}`)
        .then(response => response.json())
        .then(data => {
            
            placeOrder(data); // Подготавливаем данные для формы заказа
        })
        .catch(err => console.error("Failed to load cart items:", err));
}
function placeOrder(data) {
    const userId = localStorage.getItem('userId');
    console.log(userId);
    const form = document.getElementById('orderForm');
    const formData = {
        UserId: userId,
        city: form.city.value,
        delivery_address: form.address.value,
        delivery_value: parseFloat(form.delivery.value),
        payment_type: form.paymentType.value,
        buyer_name: form.buyerName.value,
        phone: form.phone.value,
        email: form.email.value,
        items: data
    };

    // Отправляем данные на сервер
    fetch('/placeOrder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Заказ успешно оформлен');
        } else {
            alert('Ошибка: ' + data.message);
        }
    })
    .catch(err => console.error('Ошибка:', err));
}


function fetchOrders() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        console.log("User not logged in");
        return;
    }
    fetch(`/orders/${userId}`)
        .then(response => response.json())
        .then(orders => {
            displayOrders(orders);
            
        })
        .catch(error => console.error('Error loading orders:', error));
}


function logout() {
    // Очистка данных пользователя в localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('email');
    localStorage.removeItem('cartCount');  // Если вы храните количество товаров в корзине

    // Вывод сообщения о выходе
    alert('You have been logged out successfully.');

    // Перенаправление пользователя на страницу входа или главную страницу
    window.location.href = '/index.html';  // Укажите здесь правильный URL

    // Если нужно, отправляем запрос на сервер для завершения сессии
    fetch('/logout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`  // Если используется токен
        }
    })
    .then(response => {
        console.log('Logout successful');
    })
    .catch(err => {
        console.error('Error logging out:', err);
    });
}
function toggleAccessibilityFeatures() {
    const body = document.body;
    body.classList.toggle('high-contrast');
    body.classList.toggle('font-large');
}




