```javascript
const cart = [];
const cartItemsContainer = document.getElementById("cart-items");
const cartTotal = document.getElementById("cart-total");
const cartCount = document.getElementById("cart-count");


function updateCart() {
cartItemsContainer.innerHTML = "";
let total = 0;
cart.forEach((item, index) => {
total += item.price;
const div = document.createElement("div");
div.className = "row-between";
div.innerHTML = `
  <span>${item.title}</span>
  <><span>$₹{item.price}</span><button onclick="removeFromCart(${index})">Remove</button></>`;
cartItemsContainer.appendChild(div);
cartTotal.textContent = `;₹${total}`;
cartCount.textContent = cart.length;

}
function removeFromCart(index) {
cart.splice(index, 1);
updateCart();
}


document.querySelectorAll(".add-to-cart").forEach(btn => {
btn.addEventListener("click", () => {
const title = btn.dataset.title;
const price = parseInt(btn.dataset.price);
cart.push({ title, price });
updateCart();
});
});
```