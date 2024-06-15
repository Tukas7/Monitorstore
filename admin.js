document.addEventListener('DOMContentLoaded', function() {
    fetchProducts();
});

function fetchProducts() {
    fetch('/products')
    .then(response => response.json())
    .then(products => {
        const productList = document.getElementById('productList');
        productList.innerHTML = products.map(product => `
            <li>
                <img src="${product.image_url}" alt="${product.name}" width="100" height="100">
                ${product.name} - ${product.price}
                <button onclick="editProduct(${product.id})">Edit</button>
                <button onclick="deleteProduct(${product.id})">Delete</button>
            </li>
        `).join('');
    })
    .catch(err => console.error('Error loading products:', err));
}



function deleteProduct(productId) {
    fetch(`/products/${productId}`, { method: 'DELETE' })
    .then(response => {
        if (!response.ok) throw new Error('Failed to delete product');
        fetchProducts();  // Обновляем список продуктов после удаления
    })
    .catch(err => alert(err.message));
}


function editProduct(productId) {
    fetch(`/products/${productId}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch product');
            return response.json();
        })
        .then(product => {
            document.getElementById('editProductId').value = product.id;
            document.getElementById('editProductName').value = product.name;
            document.getElementById('editProductDescription').value = product.description;
            document.getElementById('editProductPrice').value = product.price;
            document.getElementById('editProductStock').value = product.stock;
            document.getElementById('editProductModal').style.display = 'block';
        })
        .catch(err => console.error('Error loading product:', err));
}
function submitEditProduct(event) {
    event.preventDefault();
    const productId = document.getElementById('editProductId').value;
    const formData = new FormData(document.getElementById('editProductForm'));
    formData.append('productId', productId);  // Убедитесь, что сервер обрабатывает это поле

    fetch(`/products/${productId}`, {
        method: 'PUT',
        body: formData
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to update product');
        closeModal('editProductModal');
        fetchProducts(); // Обновляем список продуктов после редактирования
    })
    .catch(err => {
        alert('Error updating product: ' + err.message);
        console.error('Error updating product:', err);
    });
}
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}