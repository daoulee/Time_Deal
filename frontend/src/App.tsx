/**
 * 고객·판매자·관리자 화면의 전체 React Router 경로와 보호 가드를 조립합니다.
 * `src/pages`의 실제 페이지, 테마, React Query, 토스트 공급자를 앱 최상단에서 연결합니다.
 * 새 라우트는 마지막 catch-all 404 경로보다 앞에 등록해야 합니다.
 */
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RequireAdmin } from "@/components/auth/AdminGuard";
import { RequireAuth } from "@/components/auth/route-guards";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/shared/theme/ThemeProvider";
import HomePage from "@/pages/Home/HomePage";
import AuthPage from "@/pages/Auth/AuthPage";
import ProductsPage from "@/pages/Products/ProductsPage";
import ProductDetailPage from "@/pages/Products/ProductDetailPage";
import CommunityPage from "@/pages/Community/CommunityPage";
import InquiryPage from "@/pages/Inquiry/InquiryPage";
import MyPage from "@/pages/MyPage/MyPage";
import SellerPage from "@/pages/Seller/SellerPage";
import { SellerDemoGuard } from "@/pages/Seller/components/SellerDemoGuard";
import AdminPage from "@/pages/Admin/AdminPage";
import NotFoundPage from "@/pages/NotFound/NotFoundPage";

const queryClient = new QueryClient();
const myPagePaths = ["/mypage", "/mypage/deals", "/mypage/orders", "/mypage/reviews", "/mypage/inquiries", "/mypage/security"];
const sellerPaths = ["/seller", "/seller/products", "/seller/products/new", "/seller/orders", "/seller/analytics", "/seller/inquiries"];
const adminPaths = ["/admin", "/admin/users", "/admin/sellers", "/admin/products", "/admin/inquiries", "/admin/reviews", "/admin/research"];

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <Sonner position="top-center" richColors />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/inquiry" element={<InquiryPage />} />
            <Route path="/auth" element={<AuthPage />} />
            {myPagePaths.map((path) => <Route key={path} path={path} element={<RequireAuth><MyPage /></RequireAuth>} />)}
            {sellerPaths.map((path) => <Route key={path} path={path} element={<SellerDemoGuard><SellerPage /></SellerDemoGuard>} />)}
            {adminPaths.map((path) => <Route key={path} path={path} element={<RequireAdmin><AdminPage /></RequireAdmin>} />)}
            {/* 모든 사용자 정의 라우트는 아래 catch-all 위에 둡니다. */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
