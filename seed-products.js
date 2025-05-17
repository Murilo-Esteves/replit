// Seed Products Script

const addProduct = async (product) => {
  const response = await fetch('http://localhost:5000/api/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...product,
      userId: 1, // demo_user id
      expirationDate: new Date(product.expirationDate).toISOString()
    }),
  });

  const data = await response.json();
  console.log(`Added product: ${product.name}`, data);
  return data;
};

const seedProducts = async () => {
  try {
    // Add products with different expiration dates
    const products = [
      {
        name: 'Leite Integral',
        categoryId: 6, // Bebidas
        expirationDate: '2025-05-15',
        quantity: 1,
        unitType: 'litro',
        autoReplenish: true,
        image: '/images/products/milk.png'
      },
      {
        name: 'Queijo Mussarela',
        categoryId: 1, // Laticínios
        expirationDate: '2025-05-08',
        quantity: 200,
        unitType: 'gramas',
        autoReplenish: true,
        image: '/images/products/cheese.png'
      },
      {
        name: 'Pão de Forma',
        categoryId: 4, // Padaria
        expirationDate: '2025-05-05',
        quantity: 1,
        unitType: 'pacote',
        autoReplenish: true,
        image: '/images/products/bread.png'
      },
      {
        name: 'Iogurte Natural',
        categoryId: 1, // Laticínios
        expirationDate: '2025-05-04',
        quantity: 400,
        unitType: 'gramas',
        autoReplenish: false,
        image: '/images/products/yogurt.png'
      },
      {
        name: 'Maçãs',
        categoryId: 3, // Vegetais (já que não tem Frutas)
        expirationDate: '2025-05-07',
        quantity: 6,
        unitType: 'unidades',
        autoReplenish: false,
        image: '/images/products/apple.png'
      },
      {
        name: 'Cenouras',
        categoryId: 3, // Vegetais
        expirationDate: '2025-05-06',
        quantity: 5,
        unitType: 'unidades',
        autoReplenish: false,
        image: '/images/products/carrot.png'
      },
      {
        name: 'Carne Moída',
        categoryId: 2, // Carnes
        expirationDate: '2025-05-03',
        quantity: 500,
        unitType: 'gramas',
        autoReplenish: true,
        image: '/images/products/ground-beef.png'
      },
      {
        name: 'Suco de Laranja',
        categoryId: 6, // Bebidas
        expirationDate: '2025-05-10',
        quantity: 1,
        unitType: 'litro',
        autoReplenish: true,
        image: '/images/products/orange-juice.png'
      }
    ];

    for (const product of products) {
      await addProduct(product);
    }

    console.log('Products seeded successfully!');
  } catch (error) {
    console.error('Error seeding products:', error);
  }
};

seedProducts();