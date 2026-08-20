/**
 * 자주 묻는 질문을 공지사항과 동일한 직각 테이블 형식으로 보여주며,
 * 질문을 클릭하면 아코디언처럼 답변이 펼쳐지는 안내 페이지입니다.
 */
import { useState } from "react";
import { AppShell } from "@/shared/layout/AppShell";
import { HelpCenterShell } from "@/shared/layout/HelpCenterShell";
import { ChevronDown, ChevronUp } from "lucide-react";

const FAQS = [
  { q: "타임딜은 어떻게 참여하나요?", a: "상품 상세 페이지에서 픽업 장소와 수령 슬롯을 선택하고 주문을 접수하면 참여가 완료됩니다. 목표 인원이 모이면 딜이 확정됩니다." },
  { q: "픽업은 언제, 어디서 하나요?", a: "주문 시 선택한 픽업 장소·시간에 방문해 수령하시면 됩니다. 마이페이지의 주문 내역에서 픽업 정보를 다시 확인할 수 있어요." },
  { q: "결제는 어떻게 진행되나요?", a: "현장 결제, 결제 없는 예약, 토스페이먼츠 카드 결제(테스트 모드) 중에서 선택할 수 있습니다." },
  { q: "마감된 딜을 다시 볼 수 있나요?", a: "상품 상세 또는 홈 화면의 재오픈 요청 버튼으로 관심을 표시하면, 요청이 많이 모였을 때 판매자가 재오픈을 검토합니다." },
  { q: "주문을 취소하고 싶어요.", a: "마이페이지 > 주문 내역에서 픽업 전 상태의 주문을 취소할 수 있습니다. 이미 픽업이 완료된 주문은 취소할 수 없습니다." },
  { q: "판매자로 입점하려면 어떻게 하나요?", a: "회원가입 시 '판매자'를 선택하거나, 마이페이지의 판매자 신청 메뉴에서 신청할 수 있습니다. 제출 후 관리자 승인이 필요합니다." },
  { q: "대량 주문(단체 주문)도 가능한가요?", a: "가능합니다. 고객센터 메뉴의 대량주문 문의로 필요한 수량과 일정을 남겨주시면 담당자가 확인 후 안내드립니다." },
  { q: "비밀번호를 잊어버렸어요.", a: "로그인 화면의 '비밀번호 찾기'를 눌러 이메일로 재설정 링크를 받아 새 비밀번호를 설정할 수 있습니다." },
];

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <AppShell>
      <HelpCenterShell>
        <div className="help-center-header">
          <h1>자주 묻는 질문</h1>
          <span>궁금한 점을 먼저 확인해 보세요. 원하는 답을 못 찾았다면 1:1 문의로 남겨주세요.</span>
        </div>
        
        {/* 직각 테이블 디자인 적용 */}
        <table className="notice-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th className="col-title" style={{ textAlign: "left", padding: "14px 16px", borderBottom: "2px solid #1a1a1a", fontSize: "14px", color: "#333" }}>질문 목록</th>
            </tr>
          </thead>
          <tbody>
            {FAQS.map((item, index) => {
              const isOpen = openIndex === index;
              return (
                <tr key={item.q} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td 
                    className="col-title" 
                    onClick={() => toggleAccordion(index)}
                    style={{ padding: "18px 16px", cursor: "pointer", background: isOpen ? "#f8f9fa" : "#ffffff", transition: "background 0.15s" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600, color: "#1a1a1a", fontSize: "15px" }}>
                        Q. {item.q}
                      </span>
                      {isOpen ? <ChevronUp size={18} color="#666" /> : <ChevronDown size={18} color="#666" />}
                    </div>
                    
                    {isOpen && (
                      <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px dashed #cbd5e1", color: "#555555", fontSize: "14px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                        A. {item.a}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </HelpCenterShell>
    </AppShell>
  );
}