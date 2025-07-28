import { IsNotEmpty, IsString } from 'class-validator';

export class AccountVerifyDto {
  @IsString()
  @IsNotEmpty()
  readonly verifyToken: string;
  @IsString()
  @IsNotEmpty()
  readonly uid: string;
}
