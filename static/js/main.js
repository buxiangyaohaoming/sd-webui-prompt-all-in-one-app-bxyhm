$(function (){
    var _tabScrollY = {};
    var _switchingTab = false;

    var switchTab = function (tab) {
        // 保存当前 tab 的页面滚动位置
        var currentActive = $("#tab-headers .tab-header-item.active").data("tab");
        if (currentActive) {
            _tabScrollY[currentActive] = window.scrollY;
        }

        $("#tab-headers .tab-header-item").removeClass("active");
        $("#tab-headers .tab-header-item[data-tab='" + tab + "']").addClass("active");
        $("#tabs > .tabitem").hide();
        $("#" + tab).show();

        // 恢复目标 tab 的页面滚动位置（切换期间禁止 scroll 事件更新 _tabScrollY）
        _switchingTab = true;
        window.scrollTo({ top: _tabScrollY[tab] || 0, behavior: 'instant' });
        // 双 rAF 确保所有因 scrollTo + DOM 高度变化触发的 scroll 事件在标记清除前处理完毕
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                _switchingTab = false;
            });
        });
    };

    $("#tab-headers").on("click", ".tab-header-item", function(){
        var tab = $(this).data("tab");
        switchTab(tab);
    });

    // 持续追踪当前 tab 的页面滚动位置（切换期间跳过）
    var _scrollTicking = false;
    window.addEventListener('scroll', function() {
        if (_switchingTab) return;
        if (_scrollTicking) return;
        _scrollTicking = true;
        requestAnimationFrame(function() {
            var activeTab = $("#tab-headers .tab-header-item.active").data("tab");
            if (activeTab) {
                _tabScrollY[activeTab] = window.scrollY;
            }
            _scrollTicking = false;
        });
    }, { passive: true });

    switchTab("tab_txt2img");
});
