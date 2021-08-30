import { Component } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  constructor(private http: HttpClient, private toastr: ToastrService) {}

  performBulkUpdate(files: FileList): void {
    if (!files?.length) {
      return;
    }

    if (!files[0].name.toLowerCase().endsWith('.csv')) {
      const message = 'Invalid file type (not csv)';
      console.error(message);
      this.toastr.error(message);
      return;
    }

    const headers = new HttpHeaders({ 'Content-Type': 'text/csv' });
    this.http.post('/bulkUpdate', files[0], { headers, responseType: 'text' }).subscribe(
      (_) => this.toastr.success('Bulk update succeeded'),
      (error) => {
        console.error(JSON.stringify(error));
        this.toastr.error('Bulk update failed, see console');
      }
    );
  }
}
