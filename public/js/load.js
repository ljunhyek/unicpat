// 웹 페이지의 HTML 요소가 모두 로드된 후 스크립트를 실행합니다.
document.addEventListener("DOMContentLoaded", function() {

    // 현재 페이지 URL을 기반으로 메뉴에 'active' 클래스를 추가하는 함수
    const setActiveNav = () => {
        // 서버에서 렌더링된 페이지의 URL 경로를 가져옵니다.
        const currentPage = window.location.pathname;

        // 모든 nav-link에서 'active' 클래스를 먼저 제거합니다.
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
            // 기존 메뉴가 있으면 제거 (토글 기능)
            const existingMenu = document.querySelector('.mobile-menu-container');
            if (existingMenu) {
                existingMenu.remove();
                return;
            }

            // 모바일 메뉴 컨테이너 생성
            const mobileMenu = document.createElement('div');
            mobileMenu.className = 'mobile-menu-container fixed inset-0 bg-white z-50 p-6 overflow-y-auto';
            
            // 모바일 메뉴 HTML 구조
            mobileMenu.innerHTML = `
                <div class="flex justify-between items-center mb-6">
                    <span class="font-bold text-2xl text-[#0F172A]">전체 메뉴</span>
                    <button class="close-menu focus:outline-none">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <nav class="space-y-2 text-lg">
                    <a href="/" class="block py-3 border-b">홈</a>
                    <a href="/about" class="block py-3 border-b">유니크 소개</a>
                    
                    <!-- 서비스 안내 (아코디언 메뉴) -->
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
                    <a href="/contact" class="block py-3">Contact Us</a>
                </nav>
            `;

            document.body.appendChild(mobileMenu);
            document.body.style.overflow = 'hidden'; // 스크롤 방지

            // 닫기 버튼 이벤트 리스너
            mobileMenu.querySelector('.close-menu').addEventListener('click', function() {
                mobileMenu.remove();
                document.body.style.overflow = ''; // 스크롤 복원
            });

            // 아코디언 메뉴 토글 이벤트 리스너
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

    // 함수 실행
    setActiveNav();
    setupMobileMenu();
});