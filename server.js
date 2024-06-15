const cors = require('cors');
const sql = require('mssql/msnodesqlv8');
const express = require('express');
const multer = require('multer');
const app = express();
const port = process.env.PORT || 3000;
const path = require('path');
app.use(express.json()); // Для разбора JSON-форматированных тел запросов
app.use(cors()); // Для обработки CORS-запросов, если фронтенд будет на другом домене
const SECRET_KEY = '1234';
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

app.use(express.static(path.join(__dirname)));
const config = {
    user: 'Ilusha', // Имя пользователя для SQL Server
    password: 'qwerty123321F', // Пароль пользователя для SQL Server
    database: 'MonitorStore',
    server: '92.53.107.236', // IP-адрес или доменное имя удаленного сервера
    port: 1433, // Порт, на котором SQL Server слушает (по умолчанию 1433)
    driver: 'msnodesqlv8',
    options: {
        
        enableArithAbort: true
      
      }
  };

sql.connect(config)
  .then(() => console.log('Connected to the Database!'))
  .catch(err => console.error('Could not connect to the database!', err));


  const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
      cb(null, 'uploads/'); // Папка для сохранения изображений
  },
  filename: function(req, file, cb) {
      cb(null, Date.now() + path.extname(file.originalname)); // Добавляем временную метку к имени файла для уникальности
  }
});

const upload = multer({ storage: storage });
// Регистрация пользователя
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 8);

    try {
        await sql.query`INSERT INTO Users (username, email, password_hash) VALUES (${username}, ${email}, ${hashedPassword})`;
        res.status(201).send('User registered!');
    } catch (err) {
        res.status(500).send('Error registering user: ' + err.message);
    }
});

// Авторизация пользователя
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await sql.query`SELECT id, password_hash, username FROM Users WHERE email = ${email}`;
        if (result.recordset.length > 0) {
            const user = result.recordset[0];
            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (isMatch) {
                const token = jwt.sign({ userId: user.id }, SECRET_KEY, { expiresIn: '1h' });
                res.json({ token, userId: user.id, userName: user.username });  // Отправляем имя пользователя
            } else {
                res.status(401).send('Authentication failed');
            }
        } else {
            res.status(401).send('User not found');
        }
    } catch (err) {
        res.status(500).send('Error logging in user: ' + err.message);
    }
});

// Получение списка всех товаров
app.get('/products', async (req, res) => {
    try {
      const result = await sql.query`SELECT * FROM Products`;
      res.json(result.recordset);
    } catch (err) {
      res.status(500).send('Error retrieving products');
    }
    
  });
  
  // Добавление нового товара
  app.post('/products', async (req, res) => {
    const { name, description, price, stock } = req.body;
    try {
      await sql.query`INSERT INTO Products (name, description, price, stock) VALUES (${name}, ${description}, ${price}, ${stock})`;
      res.status(201).send('Product added');
    } catch (err) {
      res.status(500).send('Error adding product');
    }
  });
  // Добавление товара в корзину

  // Получение данных пользователя
app.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await sql.query`SELECT username, email FROM Users WHERE id = ${userId}`;
        res.json(user.recordset[0]);
    } catch (err) {
        res.status(500).send('Error fetching user data');
    }
    
});

// Обновление данных пользователя
app.put('/user/:userId', async (req, res) => {
    const { userId } = req.params;
    const { username, email } = req.body;
    try {
        await sql.query`UPDATE Users SET username = ${username}, email = ${email} WHERE id = ${userId}`;
        res.send('User updated successfully');
    } catch (err) {
        res.status(500).send('Error updating user data');
    }
});

// Получение истории заказов пользователя
app.get('/orders/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        // Подключение к базе данных
        const pool = await sql.connect(config);

        // Получение списка заказов пользователя
        const orders = await pool.request()
            .input('userId', sql.Int, parseInt(userId))
            .query('SELECT id, city, delivery_address, order_date, delivery_estimate, statuquantitys, total, payment_type FROM orders WHERE user_id = @userId');

        if (orders.recordset.length === 0) {
            res.json([]);
            return;
        }

        // Подготовка TVP для идентификаторов заказов
        const orderIds = orders.recordset.map(order => order.id);
        const tvp = new sql.Table('IdList'); // Указываем имя пользовательского типа
        tvp.columns.add('id', sql.Int);
        orderIds.forEach(id => tvp.rows.add(id));

        // Получение товаров для заказов через хранимую процедуру
        const orderItems = await pool.request()
            .input('orderIds', tvp)
            .execute('spGetOrderItems');

        // Организация товаров по каждому заказу
        const itemsByOrder = orderItems.recordset.reduce((acc, item) => {
            if (!acc[item.order_id]) {
                acc[item.order_id] = [];
            }
            acc[item.order_id].push({
                name: item.name,
                quantity: item.quantity,
                price: item.price
            });
            return acc;
        }, {});

        // Добавление товаров к каждому заказу
        const ordersWithItems = orders.recordset.map(order => ({
            ...order,
            items: itemsByOrder[order.id] || []
        }));

        // Возвращаем готовые данные клиенту
        res.json(ordersWithItems);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Failed to load orders', error: error.message });
    }
});

app.put('/user/:userId', async (req, res) => {
    const { userId } = req.params;
    const { username, email } = req.body;
    try {
        await sql.query`UPDATE Users SET username = ${username}, email = ${email} WHERE id = ${userId}`;
        res.json({ message: 'User updated successfully' });
    } catch (err) {
        res.status(500).send('Error updating user data: ' + err.message);
    }
});

app.post('/productsAdd', upload.single('image'), async (req, res) => {
  const { name, description, price, stock,category, screen_size, resolution, refresh_rate,response_time,panel_type } = req.body;
  const imageUrl = `/uploads/${req.file.filename}`; // URL к изображению
  try {
      await sql.query`INSERT INTO Products (name, description, price, stock, image_url,category, screen_size, resolution, refresh_rate,response_time,panel_type ) VALUES (${name}, ${description}, ${price}, ${stock}, ${imageUrl}, ${category}, ${screen_size}, ${resolution}, ${refresh_rate}, ${response_time}, ${panel_type})`;
      res.redirect('/admin.html'); // Редирект обратно в админскую панель
  } catch (err) {
      res.status(500).send('Error adding product: ' + err.message);
  }
});


app.get('/products/:productId', async (req, res) => {
  const { productId } = req.params;
  try {
      const result = await sql.query`SELECT * FROM Products WHERE id = ${productId}`;
      if (result.recordset.length > 0) {
          const product = result.recordset[0];
          // Убедитесь, что спецификации корректно возвращаются и форматируются
          product.specifications = product.specifications ? product.specifications.split(';') : []; // Предполагаем, что спецификации разделены точкой с запятой
          res.json(product);
      } else {
          res.status(404).send('Product not found');
      }
  } catch (err) {
      res.status(500).send('Error retrieving product: ' + err.message);
  }
  
});

// Обновление товара
app.put('/products/:productId', upload.single('image'), async (req, res) => {
  const { productId } = req.params;
  const { name, description, price, stock } = req.body;
  let imageUrl = req.body.image_url;  // Предполагаем, что imageUrl уже есть, если изображение не обновляется

  if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;  // Обновляем URL изображения, если файл предоставлен
  }

  try {
      await sql.query`UPDATE Products SET name = ${name}, description = ${description}, price = ${price}, stock = ${stock}, image_url = ${imageUrl} WHERE id = ${productId}`;
      res.send('Product updated successfully');
  } catch (err) {
      res.status(500).send('Error updating product: ' + err.message);
  }
});

// Удаление товара
app.delete('/products/:productId', async (req, res) => {
  const { productId } = req.params;
  try {
      await sql.query`DELETE FROM Products WHERE id = ${productId}`;
      res.send('Product deleted successfully');
  } catch (err) {
      res.status(500).send('Error deleting product: ' + err.message);
  }
});
app.use((req, res, next) => {
    
    next();
    
});
app.get('/search', async (req, res) => {
    
    const { search, category, size, resolution, panelType } = req.query;
    let conditions = [];
    let hasParams = false;

    if (search) {
        conditions.push("name LIKE @search");
        hasParams = true;
    }
    if (category) {
        conditions.push("category = @category");
        hasParams = true;
    }
    if (size) {
        conditions.push("screen_size = @size");
        hasParams = true;
    }
    if (resolution) {
        conditions.push("resolution = @resolution");
        hasParams = true;
    }
    if (panelType) {
        conditions.push("panel_type = @panelType");
        hasParams = true;
    }

    if (!hasParams) {
        res.status(400).json({ message: "No filter parameters provided" });
        return;
    }

    const query = `SELECT * FROM Products ${conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''}`;

    try {
        const request = new sql.Request();
        if (search) request.input('search', sql.VarChar, `%${search}%`);
        if (category) request.input('category', sql.VarChar, category);
        if (size) request.input('size', sql.VarChar, size);
        if (resolution) request.input('resolution', sql.VarChar, resolution);
        if (panelType) request.input('panelType', sql.VarChar, panelType);

        const result = await request.query(query);
        res.json(result.recordset);
        
    } catch (err) {
        console.error("SQL error:", err);
        res.status(500).json({ message: "Internal Server Error", error: err.message });
    }
    
});




app.post('/addToCart', async (req, res) => {
    const { userId, productId, quantity } = req.body;
    
    try {
        const result = await sql.query`SELECT quantity FROM Cart_items WHERE user_id = ${userId} AND product_id = ${productId}`;
        if (result.recordset.length > 0) {
            const newQuantity = result.recordset[0].quantity + quantity;
            await sql.query`UPDATE Cart_items SET quantity = ${newQuantity} WHERE user_id = ${userId} AND product_id = ${productId}`;
        } else {
            await sql.query`INSERT INTO Cart_items (user_id, product_id, quantity) VALUES (${userId}, ${productId}, ${quantity})`;
        }
        res.json({ success: true, message: 'Product added to cart successfully' });
    } catch (err) {
        console.error('Error adding product to cart:', err);
        res.status(500).json({ error: 'Error adding product to cart', message: err.message });
    }
});

app.get('/cartCount/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await sql.query`SELECT SUM(quantity) as total FROM Cart_items WHERE user_id = ${userId}`;
        const totalQuantity = result.recordset[0].total || 0;
        res.json({ count: totalQuantity });
    } catch (err) {
        console.error('Error getting cart count:', err);
        res.status(500).json({ message: 'Error getting cart count', error: err.message });
    }
});
app.get('/cartItems/:userId', async (req, res) => {
    const { userId } = req.params;
    
    try {
        const result = await sql.query`SELECT Products.id, Products.name, Products.price, Cart_items.quantity, Products.image_url FROM Products JOIN Cart_items ON Products.id = Cart_items.product_id WHERE Cart_items.user_id = ${userId}`;
        
        res.json(result.recordset);
        
    } catch (err) {
        res.status(500).send('Error retrieving cart items: ' + err.message);
    }
});
app.put('/updateCartItem', async (req, res) => {
    const { userId, id, quantity } = req.body;
        await sql.query`UPDATE Cart_items SET quantity = ${quantity} WHERE user_id = ${userId} AND product_id = ${id}`;
        
        res.json({ success: true, message: 'Cart updated successfully' });
    
});
app.delete('/removeCartItem/:userId/:productId', async (req, res) => {
    const { userId, productId } = req.params;
    await sql.query`DELETE FROM Cart_items WHERE user_id = ${userId} AND product_id = ${productId}`;
    res.json({ success: true, message: 'Product removed from cart' });
});
app.post('/placeOrder', async (req, res) => {
    const {UserId ,city, delivery_address, delivery_value, payment_type, buyer_name, phone, email, items } = req.body;
    

    try {
        const pool = await sql.connect(config);
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0) + delivery_value;

        // Используем шаблонные строки непосредственно в запросе
        const orderResult = await sql.query`
        INSERT INTO orders (city, delivery_address, delivery_value, payment_type, buyer_name, phone, email, total, user_id, statuquantitys)
        OUTPUT INSERTED.id
        VALUES (${city}, ${delivery_address}, ${delivery_value}, ${payment_type}, ${buyer_name}, ${phone}, ${email}, ${total}, ${UserId}, 'Обрабатывается')`;


        const orderId = orderResult.recordset[0].id;

        // Вставляем все элементы заказа
        for (const item of items) {
            await sql.query`
                INSERT INTO order_items (order_id, product_id, quantity, price)
                VALUES (${orderId}, ${item.id}, ${item.quantity}, ${item.price})`;
        }

        await transaction.commit();
        res.json({ success: true, message: 'Order placed successfully', orderId: orderId });
    } catch (err) {
        if (transaction) {
            await transaction.rollback();
        }
        console.error('Error placing order:', err);
        res.status(500).json({ success: false, message: 'Failed to place order', error: err.message });
    }
});


app.get('/orders/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await sql.query`SELECT * FROM Orders WHERE user_id = ${userId}`;
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send('Error retrieving order history');
    }
});

