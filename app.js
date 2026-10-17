require('dotenv').config({ path: ['.env.local', '.env'] });
const express = require('express');
const methodOverride = require('method-override');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method')); // Cho phép gửi PATCH và DELETE thông qua query parameter _method
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Import Routers
const userRouter = require('./routes/user');
const adminDishRouter = require('./routes/adminDishes');
const adminChefRouter = require('./routes/adminChefs');
const adminIngredientRouter = require('./routes/adminIngredients');

// Routes
app.use('/dishes', userRouter);
app.use('/admin/dishes', adminDishRouter);
app.use('/admin/chefs', adminChefRouter);
app.use('/admin/ingredients', adminIngredientRouter);

app.get('/', (req, res) => {
  res.redirect('/dishes');
});

// Handler 404 chung
app.use((req, res) => {
  res.status(404).send('404 - Không tìm thấy trang');
});

app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});