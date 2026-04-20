import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

const PALETTE = ['#1565C0', '#2E7D32', '#6A1B9A', '#AD1457', '#00695C', '#E65100', '#4527A0', '#283593'];

@Component({
  selector: 'lib-counsellor-avatar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './counsellor-avatar.component.html',
  styleUrl: './counsellor-avatar.component.scss',
})
export class CounsellorAvatarComponent {
  name = input<string>('');
  size = input<number>(80);

  initials = computed(() => {
    const parts = this.name().trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  });

  bgColor = computed(() => {
    let hash = 0;
    for (let i = 0; i < this.name().length; i++) hash = (hash * 31 + this.name().charCodeAt(i)) >>> 0;
    return PALETTE[hash % PALETTE.length];
  });
}
