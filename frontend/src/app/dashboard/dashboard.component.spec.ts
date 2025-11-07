// import { ComponentFixture, TestBed } from '@angular/core/testing';

// import { DashboardComponent } from './dashboard.component';

// describe('DashboardComponent', () => {
//   let component: DashboardComponent;
//   let fixture: ComponentFixture<DashboardComponent>;

//   beforeEach(() => {
//     TestBed.configureTestingModule({
//       imports: [DashboardComponent]
//     });
//     fixture = TestBed.createComponent(DashboardComponent);
//     component = fixture.componentInstance;
//     fixture.detectChanges();
//   });

//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });
// });



import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

describe('DashboardComponent (standalone)', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DashboardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    localStorage.clear();
  });

  it('loads medications and renders list', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const items = fixture.debugElement.queryAll(By.css('.med-list li'));
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].nativeElement.textContent).toContain('Lisinopril');
  }));

  it('toggles a medication and persists', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const firstCheckbox: DebugElement = fixture.debugElement.query(By.css('.med-list li input'));
    firstCheckbox.triggerEventHandler('change', { target: { checked: true } });
    fixture.detectChanges();

    expect(Object.values(component.checked).some(v => v === true)).toBeTrue();

    const keyPrefix = 'medcheck_';
    const storedKeys = Object.keys(localStorage).filter(k => k.startsWith(keyPrefix));
    expect(storedKeys.length).toBeGreaterThan(0);
  }));

  it('markAllTaken sets all checked', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    component.markAllTaken();
    expect(Object.values(component.checked).every(v => v === true)).toBeTrue();
  }));
});