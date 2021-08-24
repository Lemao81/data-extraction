import { Component, ViewChild } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'data-extraction';
  firestoreUrl = '';

  @ViewChild('errorText') errorText;

  uploadData(): void {
    this.checkUrlInput();
  }

  downloadData(): void {
    this.checkUrlInput();
  }

  onUrlChange() {
    this.errorText.nativeElement.innerHTML = '';
  }

  private checkUrlInput(): void {
    if (!this.firestoreUrl) {
      this.errorText.nativeElement.innerHTML = 'No firestore url provided';
    }
  }
}
