import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const storedProduct = cart.find(product => product.id === productId)

      if (storedProduct) {
        updateProductAmount({ productId, amount: storedProduct.amount + 1 })

        return
      }

      const { data: newProduct } = await api.get<Product>(`/products/${productId}`)

      setCart([...cart, { ...newProduct, amount: 1 }])
      localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, { ...newProduct, amount: 1 }]))
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart]
      const productIndex = cart.findIndex(product => product.id === productId)

      if (productIndex >= 0) {
        cart.splice(productIndex, 1)

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
        setCart(updatedCart)
      } else {
        throw Error()
      }
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    if (amount <= 0) {
      return
    }

    try {
      const { data: productStock } = await api.get<Stock>(`/stock/${productId}`)

      const sotoredProduct = cart.find(product => product.id === productId)

      if (sotoredProduct) {
        if (amount > productStock.amount) {
          return toast.error('Quantidade solicitada fora de estoque')
        }

        const updatedProducts = cart.map(product => {
          if (product.id === productId) {
            return { ...sotoredProduct, amount: amount }
          }

          return product
        })

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedProducts))
        setCart(updatedProducts)
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
