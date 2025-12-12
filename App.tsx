
import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './ThemeContext';
import { AdminProvider } from './contexts/AdminContext';
import { ToastProvider } from './contexts/ToastContext';
import { LoginForm } from './components/LoginForm';
import { Dashboard } from './components/Dashboard';
import { ContractSelection } from './components/ContractSelection';
import { InvoiceList } from './components/InvoiceList';
import { InvoiceDetail } from './components/InvoiceDetail';
import { FiscalInvoiceList } from './components/FiscalInvoiceList';
import { TrafficExtract } from './components/TrafficExtract';
import { ConnectionHistory } from './components/ConnectionHistory';
import { UnlockService } from './components/UnlockService';
import { WebViewContainer } from './components/WebViewContainer';
import { WifiManager } from './components/WifiManager';
import { ServiceRequests } from './components/ServiceRequests';
import { AdminLogin } from './components/AdminLogin';
import { AdminPanel } from './components/AdminPanel';
import { PartnerPortal } from './components/PartnerPortal'; // New Partner Portal
import { CarMode } from './components/CarMode';
import { BenefitsClub } from './components/BenefitsClub';
import { InstallPrompt } from './components/InstallPrompt';
import { AppView, SGPContract, UserSession, SGPInvoice } from './types';
import { APIService } from './services/apiService';

function AppContent() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LOGIN);
  const [session, setSession] = useState<UserSession | null>(null);
  const [selectedContract, setSelectedContract] = useState<SGPContract | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<string | number | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<SGPInvoice | null>(null);
  const [webViewConfig, setWebViewConfig] = useState<{url: string, title: string} | null>(null);
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(true);

  // Auto Login Check
  useEffect(() => {
    const checkAutoLogin = async () => {
        const savedAuth = localStorage.getItem('citmax_auth');
        if (savedAuth) {
            try {
                const { u, p } = JSON.parse(atob(savedAuth));
                if (u && p) {
                    const contracts = await APIService.login(u, p);
                    if (contracts && contracts.length > 0) {
                        handleLoginSuccess(contracts, u, p);
                    }
                }
            } catch (e) {
                console.error("Auto login failed", e);
                localStorage.removeItem('citmax_auth');
            }
        }
        setIsAutoLoggingIn(false);
    };
    checkAutoLogin();
  }, []);

  const handleLoginSuccess = (contracts: SGPContract[], cpfCnpj: string, password?: string) => {
    const newSession = {
      contracts,
      cpfCnpj,
      password 
    };
    setSession(newSession);

    if (contracts.length === 1) {
      handleContractSelect(contracts[0]);
    } else {
      setCurrentView(AppView.CONTRACT_SELECTION);
    }
  };

  const handleContractSelect = (contract: SGPContract) => {
    setSelectedContractId(contract.id_contrato);
    setSelectedContract(contract);
    setCurrentView(AppView.DASHBOARD);
  };

  const handleChangeContract = () => {
    setSelectedContract(null);
    setSelectedContractId(null);
    setCurrentView(AppView.CONTRACT_SELECTION);
  };

  const handleLogout = () => {
    localStorage.removeItem('citmax_auth'); // Clear auth
    setSession(null);
    setSelectedContract(null);
    setSelectedContractId(null);
    setCurrentView(AppView.LOGIN);
  };

  const handleSelectInvoice = (invoice: SGPInvoice) => {
    setSelectedInvoice(invoice);
    setCurrentView(AppView.INVOICE_DETAIL);
  };

  const handleOpenWebView = (url: string, title: string) => {
    setWebViewConfig({ url, title });
    setCurrentView(AppView.WEBVIEW);
  };

  if (isAutoLoggingIn) {
      return (
          <div className="min-h-screen bg-[#036271] flex items-center justify-center flex-col text-white">
              <div className="w-16 h-16 border-4 border-[#00c896] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="font-['Righteous'] text-lg animate-pulse">CITmax</p>
          </div>
      );
  }

  return (
    <div className="font-sans h-full bg-slate-50 dark:bg-[#01252b] transition-colors duration-300">
      
      {/* Installation Prompt (Global) */}
      <InstallPrompt />

      {/* AUTH ROUTES */}
      {currentView === AppView.LOGIN && (
        <LoginForm 
          onLoginSuccess={handleLoginSuccess} 
          onAdminClick={() => setCurrentView(AppView.ADMIN_LOGIN)}
          onPartnerClick={() => setCurrentView(AppView.PARTNER_LOGIN)}
        />
      )}

      {currentView === AppView.ADMIN_LOGIN && (
        <AdminLogin 
          onSuccess={() => setCurrentView(AppView.ADMIN_PANEL)}
          onBack={() => setCurrentView(AppView.LOGIN)}
        />
      )}

      {currentView === AppView.ADMIN_PANEL && (
        <AdminPanel 
          onLogout={() => setCurrentView(AppView.LOGIN)}
        />
      )}

      {/* PARTNER PORTAL ROUTE (New) */}
      {currentView === AppView.PARTNER_LOGIN && (
        <PartnerPortal 
          onLogout={() => setCurrentView(AppView.LOGIN)}
        />
      )}

      {/* CLIENT APP ROUTES */}
      {currentView === AppView.CONTRACT_SELECTION && session && (
        <ContractSelection 
          contracts={session.contracts} 
          onSelect={handleContractSelect}
          onLogout={handleLogout}
          userName={session.contracts[0]?.razao_social}
        />
      )}
      
      {currentView === AppView.DASHBOARD && session && selectedContract && (
        <Dashboard 
          contract={selectedContract}
          userCpfCnpj={session.cpfCnpj}
          userPassword={session.password || ''}
          onLogout={handleLogout} 
          onChangeContract={session.contracts.length > 1 ? handleChangeContract : undefined}
          onViewInvoices={() => setCurrentView(AppView.INVOICES)}
          onSelectInvoice={handleSelectInvoice}
          onViewFiscalInvoices={() => setCurrentView(AppView.FISCAL_INVOICES)}
          onOpenWebView={handleOpenWebView}
          onViewTraffic={() => setCurrentView(AppView.TRAFFIC_EXTRACT)}
          onViewUnlock={() => setCurrentView(AppView.UNLOCK_SERVICE)}
          onViewConnection={() => setCurrentView(AppView.CONNECTION_HISTORY)}
          onViewWifiManager={() => setCurrentView(AppView.WIFI_MANAGER)}
          onViewRequests={() => setCurrentView(AppView.REQUESTS)}
          onEnterCarMode={() => setCurrentView(AppView.CAR_MODE)}
          onViewBenefits={() => setCurrentView(AppView.BENEFITS_CLUB)}
        />
      )}

      {currentView === AppView.CAR_MODE && session && selectedContract && (
        <CarMode
          contract={selectedContract}
          userCpfCnpj={session.cpfCnpj}
          userPassword={session.password || ''}
          onClose={() => setCurrentView(AppView.DASHBOARD)}
        />
      )}

      {currentView === AppView.BENEFITS_CLUB && session && (
        <BenefitsClub 
          onBack={() => setCurrentView(AppView.DASHBOARD)}
        />
      )}

      {currentView === AppView.INVOICES && session && selectedContract && (
        <InvoiceList
          contract={selectedContract}
          userCpfCnpj={session.cpfCnpj}
          userPassword={session.password || ''}
          onBack={() => setCurrentView(AppView.DASHBOARD)}
          onSelectInvoice={handleSelectInvoice}
        />
      )}

      {currentView === AppView.INVOICE_DETAIL && selectedInvoice && (
        <InvoiceDetail 
          invoice={selectedInvoice}
          onBack={() => setCurrentView(AppView.INVOICES)}
        />
      )}

      {currentView === AppView.FISCAL_INVOICES && session && selectedContract && (
        <FiscalInvoiceList
          contract={selectedContract}
          onBack={() => setCurrentView(AppView.DASHBOARD)}
        />
      )}

      {currentView === AppView.TRAFFIC_EXTRACT && session && selectedContract && (
        <TrafficExtract
          contract={selectedContract}
          userCpfCnpj={session.cpfCnpj}
          userPassword={session.password || ''}
          onBack={() => setCurrentView(AppView.DASHBOARD)}
        />
      )}

      {currentView === AppView.CONNECTION_HISTORY && session && selectedContract && (
        <ConnectionHistory
          contract={selectedContract}
          userCpfCnpj={session.cpfCnpj}
          userPassword={session.password}
          onBack={() => setCurrentView(AppView.DASHBOARD)}
        />
      )}

      {currentView === AppView.WIFI_MANAGER && session && selectedContract && (
        <WifiManager
          onBack={() => setCurrentView(AppView.DASHBOARD)}
          onOpenWebView={handleOpenWebView}
        />
      )}

      {currentView === AppView.UNLOCK_SERVICE && session && selectedContract && (
        <UnlockService
          contract={selectedContract}
          userCpfCnpj={session.cpfCnpj}
          userPassword={session.password || ''}
          onBack={() => setCurrentView(AppView.DASHBOARD)}
        />
      )}

      {currentView === AppView.REQUESTS && session && selectedContract && (
        <ServiceRequests
          contract={selectedContract}
          userCpfCnpj={session.cpfCnpj}
          userPassword={session.password || ''}
          onBack={() => setCurrentView(AppView.DASHBOARD)}
        />
      )}

      {currentView === AppView.WEBVIEW && webViewConfig && (
        <WebViewContainer
          url={webViewConfig.url}
          title={webViewConfig.title}
          onBack={() => setCurrentView(AppView.DASHBOARD)}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <AdminProvider>
      <ToastProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </ToastProvider>
    </AdminProvider>
  );
}

export default App;
