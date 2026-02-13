// 웹 페이지의 HTML 요소가 모두 로드된 후 스크립트를 실행합니다.
document.addEventListener("DOMContentLoaded", function() {

    // 현재 페이지 URL을 기반으로 메뉴에 'active' 클래스를 추가하는 함수
    const setActiveNav = () => {
        const currentPage = window.location.pathname;

        document.querySelectorAll('#main-nav .nav-link').forEach(link => {
            link.classList.remove('active');
        });

        let targetNavId = '';

        if (currentPage === '/' || currentPage.endsWith('index.html')) {
            targetNavId = 'nav-home';
        } else if (currentPage.includes('/about')) {
            targetNavId = 'nav-about';
        } else if (['/patent', '/trademark', '/design', '/startup', '/dispute-transfer'].some(page => currentPage.includes(page))) {
            targetNavId = 'nav-service';
        } else if (currentPage.includes('/column')) {
            targetNavId = 'nav-column';
        } else if (currentPage.includes('/newsletter')) {
            targetNavId = 'nav-newsletter';
        } else if (currentPage.includes('/gov-support')) {
            targetNavId = 'nav-gov';
        } else if (currentPage.includes('/contact')) {
            targetNavId = 'nav-contact';
        }
        
        if (targetNavId) {
            const activeLink = document.getElementById(targetNavId);
            if (activeLink) {
                activeLink.classList.add('active');
            }
        }
    };
    
    // 모바일 메뉴를 생성하고 이벤트를 연결하는 함수
    const setupMobileMenu = () => {
        const mobileMenuButton = document.querySelector('.mobile-menu-button');
        if (!mobileMenuButton) return;

        mobileMenuButton.addEventListener('click', function() {
            const existingMenu = document.querySelector('.mobile-menu-container');
            if (existingMenu) {
                existingMenu.remove();
                return;
            }

            const mobileMenu = document.createElement('div');
            mobileMenu.className = 'mobile-menu-container fixed inset-0 bg-white z-50 p-6 overflow-y-auto';
            
            // ▼▼▼ [핵심 수정] "전체 메뉴" 텍스트 부분을 삭제하고 닫기 버튼만 남깁니다. ▼▼▼
            mobileMenu.innerHTML = `
                <div class="flex justify-end items-center mb-6">
                    <button class="close-menu focus:outline-none p-2 -mr-2">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <nav class="space-y-2 text-lg">
                    <a href="/" class="block py-3 border-b">홈</a>
                    <a href="/about" class="block py-3 border-b">유니크 소개</a>
                    
                    <div class="border-b">
                        <div class="flex justify-between items-center py-3 cursor-pointer mobile-menu-toggle">
                            <span>서비스 안내</span>
                            <i class="fas fa-chevron-down transition-transform duration-300"></i>
                        </div>
                        <div class="mobile-submenu hidden pl-4 pt-2 pb-2 space-y-3 text-base bg-gray-50 rounded-b-md">
                            <a href="/patent" class="block text-gray-700 hover:text-[#54B435]">특허/실용신안 출원</a>
                            <a href="/trademark" class="block text-gray-700 hover:text-[#54B435]">상표 출원/등록</a>
                            <a href="/design" class="block text-gray-700 hover:text-[#54B435]">디자인 출원/등록</a>
                            <a href="/startup" class="block text-gray-700 hover:text-[#54B435]">창업 및 스타트업 특화 서비스</a>
                            <a href="/dispute-transfer" class="block text-gray-700 hover:text-[#54B435]">IP 분쟁 대응</a>
                        </div>
                    </div>

                    <a href="/column" class="block py-3 border-b">유니크 칼럼</a>
                    <a href="/newsletter" class="block py-3 border-b">뉴스레터</a>
                    <a href="/gov-support" class="block py-3 border-b">정부지원사업 안내</a>
                    <a href="/contact" class="block py-3 border-b">Contact Us</a>
                    <a href="https://www.ipbot1.com" class="block py-3" target="_blank">실시간 특허관리</a>
                </nav>
            `;
            // ▲▲▲ 여기까지 ▲▲▲

            document.body.appendChild(mobileMenu);
            document.body.style.overflow = 'hidden';

            mobileMenu.querySelector('.close-menu').addEventListener('click', function() {
                mobileMenu.remove();
                document.body.style.overflow = '';
            });

            mobileMenu.querySelectorAll('.mobile-menu-toggle').forEach(button => {
                button.addEventListener('click', function() {
                    const submenu = this.nextElementSibling;
                    const icon = this.querySelector('i');
                    
                    submenu.classList.toggle('hidden');
                    icon.classList.toggle('rotate-180');
                });
            });
        });
    };

    setActiveNav();
    setupMobileMenu();
});