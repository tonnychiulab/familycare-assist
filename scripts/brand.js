(function () {
  const brand = Object.freeze({
    localizedNames: {
      "zh-TW": "家醫智問 FamilyCare Assist",
      "zh-CN": "家医智问 FamilyCare Assist",
      "en": "FamilyCare Assist",
      "th": "FamilyCare Assist",
      "id": "FamilyCare Assist",
      "vi": "FamilyCare Assist"
    },
    localizedTitles: {
      "zh-TW": "家醫智問 FamilyCare Assist｜家庭醫學科智慧問診輔助系統",
      "zh-CN": "家医智问 FamilyCare Assist｜家庭医学智能问诊辅助系统",
      "en": "FamilyCare Assist | Family Medicine Consultation Assistant",
      "th": "FamilyCare Assist | ระบบช่วยซักประวัติเวชศาสตร์ครอบครัว",
      "id": "FamilyCare Assist | Asisten Wawancara Kedokteran Keluarga",
      "vi": "FamilyCare Assist | Trợ lý khai thác bệnh sử y học gia đình"
    }
  });

  window.BrandService = {
    getName(locale) { return brand.localizedNames[locale] || brand.localizedNames.en; },
    getTitle(locale) { return brand.localizedTitles[locale] || brand.localizedTitles.en; },
    apply(locale) {
      document.title = this.getTitle(locale);
      const brandName = document.getElementById("brandName");
      const footerBrand = document.getElementById("footerBrand");
      if (brandName) brandName.textContent = this.getName(locale);
      if (footerBrand) footerBrand.textContent = this.getName(locale);
    }
  };
})();
