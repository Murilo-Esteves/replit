import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

// Schemas de validação
const loginSchema = z.object({
  username: z.string().min(1, "O nome de usuário é obrigatório"),
  password: z.string().min(1, "A senha é obrigatória")
});

const registerSchema = z.object({
  fullName: z.string().min(1, "O nome completo é obrigatório"),
  email: z.string().email("E-mail inválido"),
  username: z.string().min(1, "O nome de usuário é obrigatório"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(1, "Confirme sua senha")
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

const AuthPage: React.FC = () => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Login form
  const { register: registerLoginForm, handleSubmit: handleLoginSubmit, formState: { errors: loginErrors } } = 
    useForm<LoginFormValues>({
      resolver: zodResolver(loginSchema)
    });

  // Register form
  const { register: registerRegisterForm, handleSubmit: handleRegisterSubmit, formState: { errors: registerErrors } } = 
    useForm<RegisterFormValues>({
      resolver: zodResolver(registerSchema)
    });

  const onLogin = async (values: LoginFormValues) => {
    try {
      setLoading(true);
      console.log("Tentando fazer login com:", values.username);
      const response = await apiRequest('POST', '/api/auth/login', values);
      
      if (response.ok) {
        const userData = await response.json();
        console.log("Login bem-sucedido:", userData);
        
        toast({
          title: "Login realizado com sucesso",
          description: "Redirecionando para página inicial...",
        });
        
        // Aguardar um momento para o toast ser exibido
        setTimeout(() => {
          // Forçar atualização do contexto e redirecionar
          window.location.href = '/home';
        }, 1000);
      } else {
        const data = await response.json();
        console.error("Erro de autenticação:", data);
        toast({
          title: "Erro de autenticação",
          description: data.message || "Usuário ou senha inválidos",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Erro",
        description: "Não foi possível realizar o login. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (values: RegisterFormValues) => {
    try {
      setLoading(true);
      // Extract only the fields needed for user creation
      const userData = {
        username: values.username,
        password: values.password
      };
      
      console.log("Tentando registrar novo usuário:", values.username);
      const response = await apiRequest('POST', '/api/auth/register', userData);
      
      if (response.ok) {
        const newUserData = await response.json();
        console.log("Registro bem-sucedido:", newUserData);
        
        toast({
          title: "Cadastro realizado com sucesso",
          description: "Redirecionando para página inicial...",
        });
        
        // Aguardar um momento para o toast ser exibido
        setTimeout(() => {
          // Forçar atualização do contexto e redirecionar
          window.location.href = '/home';
        }, 1000);
      } else {
        const data = await response.json();
        console.error("Erro no cadastro:", data);
        toast({
          title: "Erro no cadastro",
          description: data.message || "Não foi possível realizar o cadastro",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Register error:", error);
      toast({
        title: "Erro",
        description: "Não foi possível realizar o cadastro. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Handler for guest login
  const handleGuestLogin = async () => {
    try {
      setLoading(true);
      console.log("Tentando login como visitante");
      const response = await apiRequest('POST', '/api/auth/guest', {});
      
      if (response.ok) {
        const userData = await response.json();
        console.log("Login como visitante bem-sucedido:", userData);
        
        toast({
          title: "Modo visitante ativado",
          description: "Bem-vindo ao Prazo Certo!",
        });
        
        // Redirect to home page
        setTimeout(() => {
          window.location.href = '/home';
        }, 1000);
      } else {
        throw new Error("Falha ao entrar como visitante");
      }
    } catch (error) {
      console.error("Guest login error:", error);
      toast({
        title: "Erro",
        description: "Não foi possível continuar como visitante. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 bg-white rounded-xl overflow-hidden shadow-xl">
        {/* Hero Section */}
        <div className="bg-primary p-8 text-white flex flex-col justify-center order-1 md:order-2">
          <h1 className="text-3xl font-bold mb-4">Prazo Certo</h1>
          <p className="text-lg mb-6">Organize sua despensa com praticidade e evite desperdícios.</p>
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="bg-white/20 p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <p>Controle de validade inteligente</p>
            </div>
            <div className="flex items-center">
              <div className="bg-white/20 p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <p>Notificações personalizadas</p>
            </div>
            <div className="flex items-center">
              <div className="bg-white/20 p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <p>Sugestões de receitas personalizadas</p>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="p-8 order-2 md:order-1">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800">
              {isLoginMode ? "Entrar na sua conta" : "Crie sua conta"}
            </h2>
            <p className="text-gray-600 mt-2">
              {isLoginMode 
                ? "Bem-vindo de volta! Acesse sua conta para continuar." 
                : "Organize sua despensa com praticidade e evite desperdícios."}
            </p>
          </div>

          {isLoginMode ? (
            // Login Form
            <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                    Nome de usuário
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...registerLoginForm('username')}
                      id="username"
                      type="text"
                      className={`pl-10 pr-3 py-2 w-full border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
                        loginErrors.username ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Seu nome de usuário"
                    />
                  </div>
                  {loginErrors.username && (
                    <p className="mt-1 text-sm text-red-600">{loginErrors.username.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Senha
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...registerLoginForm('password')}
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      className={`pl-10 pr-10 py-2 w-full border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
                        loginErrors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Sua senha"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                    </button>
                  </div>
                  {loginErrors.password && (
                    <p className="mt-1 text-sm text-red-600">{loginErrors.password.message}</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-colors"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setIsLoginMode(false)}
                  className="text-primary hover:underline focus:outline-none text-sm"
                >
                  Não tem uma conta? Cadastre-se
                </button>
              </div>
              
              <div className="text-center mt-2">
                <button
                  type="button"
                  onClick={handleGuestLogin}
                  className="text-gray-500 hover:underline focus:outline-none text-sm"
                >
                  Continuar como visitante
                </button>
              </div>
            </form>
          ) : (
            // Register Form
            <form onSubmit={handleRegisterSubmit(onRegister)} className="space-y-5">
              <div className="space-y-4">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                    Nome completo
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...registerRegisterForm('fullName')}
                      id="fullName"
                      type="text"
                      className={`pl-10 pr-3 py-2 w-full border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
                        registerErrors.fullName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Seu nome completo"
                    />
                  </div>
                  {registerErrors.fullName && (
                    <p className="mt-1 text-sm text-red-600">{registerErrors.fullName.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    E-mail
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...registerRegisterForm('email')}
                      id="email"
                      type="email"
                      className={`pl-10 pr-3 py-2 w-full border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
                        registerErrors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="seu@email.com"
                    />
                  </div>
                  {registerErrors.email && (
                    <p className="mt-1 text-sm text-red-600">{registerErrors.email.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                    Nome de usuário
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...registerRegisterForm('username')}
                      id="username"
                      type="text"
                      className={`pl-10 pr-3 py-2 w-full border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
                        registerErrors.username ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Escolha um nome de usuário"
                    />
                  </div>
                  {registerErrors.username && (
                    <p className="mt-1 text-sm text-red-600">{registerErrors.username.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Senha
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...registerRegisterForm('password')}
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      className={`pl-10 pr-10 py-2 w-full border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
                        registerErrors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                    </button>
                  </div>
                  {registerErrors.password && (
                    <p className="mt-1 text-sm text-red-600">{registerErrors.password.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar senha
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...registerRegisterForm('confirmPassword')}
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      className={`pl-10 pr-10 py-2 w-full border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
                        registerErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Digite sua senha novamente"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                    </button>
                  </div>
                  {registerErrors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{registerErrors.confirmPassword.message}</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-colors"
              >
                {loading ? 'Cadastrando...' : 'Criar conta'}
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setIsLoginMode(true)}
                  className="text-primary hover:underline focus:outline-none text-sm"
                >
                  Já tem uma conta? Faça login
                </button>
              </div>
              
              <div className="text-center mt-2">
                <button
                  type="button"
                  onClick={handleGuestLogin}
                  className="text-gray-500 hover:underline focus:outline-none text-sm"
                >
                  Continuar como visitante
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;